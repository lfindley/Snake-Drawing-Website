import { usablePhotoShapeRecords } from "@/data/photo-shapes";
import { snakeProfiles } from "@/data/snakes";
import { extractStrokeFeatures } from "@/lib/extract-features";
import { clamp } from "@/lib/geometry";
import { extractStrokeSilhouetteFeatures } from "@/lib/mask-shape";
import { normalizeStroke } from "@/lib/normalize-stroke";
import type {
  FeatureBreakdown,
  MatchResult,
  PhotoShapeRecord,
  StrokeFeatures,
  StrokePoint,
} from "@/lib/types";

const silhouetteWeight = 0.72;
const speciesProfileWeight = 0.28;

const featureWeights = {
  aspectRatio: 0.22,
  fillRatio: 0.18,
  compactness: 0.18,
  huMoment1: 0.18,
  huMoment2: 0.14,
  huMoment3: 0.1,
} as const;

const featureLabels: Record<keyof typeof featureWeights, string> = {
  aspectRatio: "Aspect ratio",
  fillRatio: "Fill ratio",
  compactness: "Compactness",
  huMoment1: "Hu moment 1",
  huMoment2: "Hu moment 2",
  huMoment3: "Hu moment 3",
};

const speciesFeatureWeights = {
  pathLength: 0.18,
  aspectRatio: 0.27,
  curvature: 0.24,
  turnVariance: 0.11,
  waviness: 0.2,
} as const;

function normalizedDifference(a: number, b: number) {
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1);
}

function confidenceLabel(score: number): MatchResult["confidenceLabel"] {
  if (score >= 82) {
    return "Strong";
  }

  if (score >= 60) {
    return "Moderate";
  }

  return "Low";
}

function buildBreakdown(
  strokeFeatures: ReturnType<typeof extractStrokeSilhouetteFeatures>,
  photoFeatures: PhotoShapeRecord["features"],
): FeatureBreakdown[] {
  const comparable = {
    aspectRatio: [strokeFeatures.aspectRatio, photoFeatures.aspectRatio],
    fillRatio: [strokeFeatures.fillRatio, photoFeatures.fillRatio],
    compactness: [strokeFeatures.compactness, photoFeatures.compactness],
    huMoment1: [strokeFeatures.huMoments[0] ?? 0, photoFeatures.huMoments[0] ?? 0],
    huMoment2: [strokeFeatures.huMoments[1] ?? 0, photoFeatures.huMoments[1] ?? 0],
    huMoment3: [strokeFeatures.huMoments[2] ?? 0, photoFeatures.huMoments[2] ?? 0],
  } as const;

  return (Object.keys(featureWeights) as Array<keyof typeof featureWeights>)
    .map((key) => {
      const [strokeValue, candidateValue] = comparable[key];
      const similarity = 1 - normalizedDifference(strokeValue, candidateValue);

      return {
        key,
        label: featureLabels[key],
        strokeValue,
        candidateValue,
        similarity: clamp(similarity, 0, 1),
      };
    })
    .sort((a, b) => b.similarity - a.similarity);
}

function speciesProfileDistance(strokeFeatures: StrokeFeatures, snakeId: string) {
  const snake = snakeProfiles.find((entry) => entry.id === snakeId);
  if (!snake) {
    return 1;
  }

  return (Object.keys(speciesFeatureWeights) as Array<keyof typeof speciesFeatureWeights>).reduce(
    (total, key) => {
      return (
        total +
        normalizedDifference(strokeFeatures[key], snake.shapeProfile[key]) * speciesFeatureWeights[key]
      );
    },
    0,
  );
}

function scorePhotoMatch(
  strokeSilhouetteFeatures: ReturnType<typeof extractStrokeSilhouetteFeatures>,
  strokeProfileFeatures: StrokeFeatures,
  photo: PhotoShapeRecord,
) {
  const values = {
    aspectRatio: [strokeSilhouetteFeatures.aspectRatio, photo.features.aspectRatio],
    fillRatio: [strokeSilhouetteFeatures.fillRatio, photo.features.fillRatio],
    compactness: [strokeSilhouetteFeatures.compactness, photo.features.compactness],
    huMoment1: [strokeSilhouetteFeatures.huMoments[0] ?? 0, photo.features.huMoments[0] ?? 0],
    huMoment2: [strokeSilhouetteFeatures.huMoments[1] ?? 0, photo.features.huMoments[1] ?? 0],
    huMoment3: [strokeSilhouetteFeatures.huMoments[2] ?? 0, photo.features.huMoments[2] ?? 0],
  } as const;

  const distance = (Object.keys(featureWeights) as Array<keyof typeof featureWeights>).reduce(
    (total, key) => {
      const [strokeValue, photoValue] = values[key];
      return total + normalizedDifference(strokeValue, photoValue) * featureWeights[key];
    },
    0,
  );
  const heuristicDistance = speciesProfileDistance(strokeProfileFeatures, photo.snakeId);
  const combinedDistance =
    distance * silhouetteWeight + heuristicDistance * speciesProfileWeight;

  return {
    distance: combinedDistance,
    breakdown: buildBreakdown(strokeSilhouetteFeatures, photo.features),
  };
}

export function matchSnake(points: StrokePoint[]): MatchResult | null {
  if (points.length < 3 || usablePhotoShapeRecords.length === 0) {
    return null;
  }

  const normalizedPoints = normalizeStroke(points);
  const strokeProfileFeatures = extractStrokeFeatures(normalizedPoints);
  const strokeSilhouetteFeatures = extractStrokeSilhouetteFeatures(points);

  const bestBySpecies = new Map<string, { snake: MatchResult["snake"]; photo: PhotoShapeRecord; distance: number; breakdown: FeatureBreakdown[] }>();

  usablePhotoShapeRecords.forEach((photo) => {
    const ranked = scorePhotoMatch(strokeSilhouetteFeatures, strokeProfileFeatures, photo);
    const snake = snakeProfiles.find((entry) => entry.id === photo.snakeId);

    if (!snake) {
      return;
    }

    const existing = bestBySpecies.get(photo.snakeId);
    if (!existing || ranked.distance < existing.distance) {
      bestBySpecies.set(photo.snakeId, {
        snake,
        photo,
        distance: ranked.distance,
        breakdown: ranked.breakdown,
      });
    }
  });

  const ranked = Array.from(bestBySpecies.values()).sort((a, b) => a.distance - b.distance);

  const best = ranked[0];
  if (!best) {
    return null;
  }

  const score = Math.round(clamp((1 - best.distance) * 100, 8, 98));

  return {
    snake: best.snake,
    photo: best.photo,
    score,
    confidenceLabel: confidenceLabel(score),
    featureBreakdown: best.breakdown,
  };
}

export function rankSnakeMatches(points: StrokePoint[], limit = 5) {
  if (points.length < 3 || usablePhotoShapeRecords.length === 0) {
    return [];
  }

  const normalizedPoints = normalizeStroke(points);
  const strokeProfileFeatures = extractStrokeFeatures(normalizedPoints);
  const strokeSilhouetteFeatures = extractStrokeSilhouetteFeatures(points);

  const bestBySpecies = new Map<string, { snake: MatchResult["snake"]; photo: PhotoShapeRecord; score: number }>();

  usablePhotoShapeRecords.forEach((photo) => {
      const snake = snakeProfiles.find((entry) => entry.id === photo.snakeId);
      if (!snake) {
        return;
      }

      const { distance } = scorePhotoMatch(strokeSilhouetteFeatures, strokeProfileFeatures, photo);
      const score = Math.round(clamp((1 - distance) * 100, 8, 98));
      const existing = bestBySpecies.get(photo.snakeId);

      if (!existing || score > existing.score) {
        bestBySpecies.set(photo.snakeId, {
        snake,
        photo,
        score,
        });
      }
    });

  return Array.from(bestBySpecies.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
