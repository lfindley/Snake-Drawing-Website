import { snakeProfiles } from "@/data/snakes";
import { extractStrokeFeatures } from "@/lib/extract-features";
import { clamp } from "@/lib/geometry";
import { extractStrokeSilhouetteFeatures } from "@/lib/mask-shape";
import { normalizeStroke } from "@/lib/normalize-stroke";
import type {
  FeatureBreakdown,
  MatchResult,
  NormalizedPathPoint,
  PhotoLineFeatures,
  PhotoShapeRecord,
  StrokeFeatures,
  StrokePoint,
} from "@/lib/types";

const lineFeatureWeights: Record<keyof PhotoLineFeatures, number> = {
  pathLength: 0.18,
  aspectRatio: 0.27,
  curvature: 0.24,
  turnVariance: 0.11,
  waviness: 0.2,
};

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

function toStrokePoints(points: NormalizedPathPoint[]): StrokePoint[] {
  return points.map((point, index) => ({
    x: point.x,
    y: point.y,
    t: index,
  }));
}

function compareNormalizedPaths(a: StrokePoint[], b: StrokePoint[]) {
  const sampleCount = Math.min(a.length, b.length);
  if (sampleCount < 2) {
    return 1;
  }

  let forward = 0;
  let reverse = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const pointA = a[index];
    const pointForward = b[index];
    const pointReverse = b[sampleCount - 1 - index];

    forward += Math.hypot(pointA.x - pointForward.x, pointA.y - pointForward.y);
    reverse += Math.hypot(pointA.x - pointReverse.x, pointA.y - pointReverse.y);
  }

  return Math.min(forward, reverse) / sampleCount;
}

function lineFeatureDistance(strokeFeatures: StrokeFeatures, photoFeatures: PhotoLineFeatures) {
  return (Object.keys(lineFeatureWeights) as Array<keyof PhotoLineFeatures>).reduce(
    (total, key) => {
      return total + normalizedDifference(strokeFeatures[key], photoFeatures[key]) * lineFeatureWeights[key];
    },
    0,
  );
}

function silhouetteDistance(
  strokeFeatures: ReturnType<typeof extractStrokeSilhouetteFeatures>,
  photo: PhotoShapeRecord,
) {
  const huA = strokeFeatures.huMoments;
  const huB = photo.features.huMoments;

  return (
    normalizedDifference(strokeFeatures.aspectRatio, photo.features.aspectRatio) * 0.22 +
    normalizedDifference(strokeFeatures.fillRatio, photo.features.fillRatio) * 0.2 +
    normalizedDifference(strokeFeatures.compactness, photo.features.compactness) * 0.2 +
    normalizedDifference(huA[0] ?? 0, huB[0] ?? 0) * 0.18 +
    normalizedDifference(huA[1] ?? 0, huB[1] ?? 0) * 0.12 +
    normalizedDifference(huA[2] ?? 0, huB[2] ?? 0) * 0.08
  );
}

function speciesProfileDistance(strokeFeatures: StrokeFeatures, snakeId: string) {
  const snake = snakeProfiles.find((entry) => entry.id === snakeId);
  if (!snake) {
    return 1;
  }

  return lineFeatureDistance(strokeFeatures, snake.shapeProfile);
}

function buildBreakdown(args: {
  linePathDistance: number;
  strokeLineFeatures: StrokeFeatures;
  photo: PhotoShapeRecord;
  strokeSilhouetteFeatures: ReturnType<typeof extractStrokeSilhouetteFeatures>;
}): FeatureBreakdown[] {
  const entries: FeatureBreakdown[] = [
    {
      key: "linePath",
      label: "Detected line path",
      strokeValue: 0,
      candidateValue: args.linePathDistance,
      similarity: clamp(1 - args.linePathDistance / 1.1, 0, 1),
    },
    {
      key: "lineAspectRatio",
      label: "Line body ratio",
      strokeValue: args.strokeLineFeatures.aspectRatio,
      candidateValue: args.photo.lineFeatures.aspectRatio,
      similarity: clamp(
        1 - normalizedDifference(args.strokeLineFeatures.aspectRatio, args.photo.lineFeatures.aspectRatio),
        0,
        1,
      ),
    },
    {
      key: "lineCurvature",
      label: "Line curvature",
      strokeValue: args.strokeLineFeatures.curvature,
      candidateValue: args.photo.lineFeatures.curvature,
      similarity: clamp(
        1 - normalizedDifference(args.strokeLineFeatures.curvature, args.photo.lineFeatures.curvature),
        0,
        1,
      ),
    },
    {
      key: "silhouetteCompactness",
      label: "Silhouette compactness",
      strokeValue: args.strokeSilhouetteFeatures.compactness,
      candidateValue: args.photo.features.compactness,
      similarity: clamp(
        1 - normalizedDifference(args.strokeSilhouetteFeatures.compactness, args.photo.features.compactness),
        0,
        1,
      ),
    },
    {
      key: "silhouetteFill",
      label: "Silhouette fill",
      strokeValue: args.strokeSilhouetteFeatures.fillRatio,
      candidateValue: args.photo.features.fillRatio,
      similarity: clamp(
        1 - normalizedDifference(args.strokeSilhouetteFeatures.fillRatio, args.photo.features.fillRatio),
        0,
        1,
      ),
    },
  ];

  return entries.sort((a, b) => b.similarity - a.similarity);
}

function scorePhotoMatch(args: {
  strokePath: StrokePoint[];
  strokeLineFeatures: StrokeFeatures;
  strokeSilhouetteFeatures: ReturnType<typeof extractStrokeSilhouetteFeatures>;
  photo: PhotoShapeRecord;
}) {
  const { strokePath, strokeLineFeatures, strokeSilhouetteFeatures, photo } = args;
  const linePoints = toStrokePoints(photo.linePoints);
  const linePathDistance = photo.lineUsable ? compareNormalizedPaths(strokePath, linePoints) : 1;
  const lineFeaturesDistance = photo.lineUsable
    ? lineFeatureDistance(strokeLineFeatures, photo.lineFeatures)
    : 1;
  const photoSilhouetteDistance = silhouetteDistance(strokeSilhouetteFeatures, photo);
  const profileDistance = speciesProfileDistance(strokeLineFeatures, photo.snakeId);

  const lineBlend = photo.lineUsable ? clamp(photo.lineQualityScore, 0.35, 1) : 0;
  const linePathWeight = 0.42 * lineBlend;
  const lineFeaturesWeight = 0.2 * lineBlend;
  const silhouetteWeight = photo.lineUsable ? 0.26 : 0.72;
  const profileWeight = photo.lineUsable ? 0.12 : 0.28;
  const normalizer = linePathWeight + lineFeaturesWeight + silhouetteWeight + profileWeight;

  const distance =
    (linePathDistance * linePathWeight +
      lineFeaturesDistance * lineFeaturesWeight +
      photoSilhouetteDistance * silhouetteWeight +
      profileDistance * profileWeight) /
    Math.max(normalizer, 1e-6);

  return {
    distance,
    breakdown: buildBreakdown({
      linePathDistance,
      strokeLineFeatures,
      photo,
      strokeSilhouetteFeatures,
    }),
  };
}

function rankPhotoCandidates(points: StrokePoint[], photoRecords: PhotoShapeRecord[]) {
  const strokePath = normalizeStroke(points);
  const strokeLineFeatures = extractStrokeFeatures(strokePath);
  const strokeSilhouetteFeatures = extractStrokeSilhouetteFeatures(points);

  const bestBySpecies = new Map<
    string,
    {
      snake: MatchResult["snake"];
      photo: PhotoShapeRecord;
      distance: number;
      breakdown: FeatureBreakdown[];
    }
  >();

  photoRecords.forEach((photo) => {
    const snake = snakeProfiles.find((entry) => entry.id === photo.snakeId);
    if (!snake) {
      return;
    }

    const scored = scorePhotoMatch({
      strokePath,
      strokeLineFeatures,
      strokeSilhouetteFeatures,
      photo,
    });

    const existing = bestBySpecies.get(photo.snakeId);
    if (!existing || scored.distance < existing.distance) {
      bestBySpecies.set(photo.snakeId, {
        snake,
        photo,
        distance: scored.distance,
        breakdown: scored.breakdown,
      });
    }
  });

  return Array.from(bestBySpecies.values()).sort((a, b) => a.distance - b.distance);
}

export function matchSnake(points: StrokePoint[], photoRecords: PhotoShapeRecord[]): MatchResult | null {
  if (points.length < 3 || photoRecords.length === 0) {
    return null;
  }

  const ranked = rankPhotoCandidates(points, photoRecords);
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
    overlay: {
      silhouetteAvailable: best.photo.silhouettePolygon.length > 2,
      photoAvailable: best.photo.silhouettePolygon.length > 2,
      lineAvailable: best.photo.lineUsable && best.photo.linePoints.length > 2,
    },
  };
}

export function rankSnakeMatches(points: StrokePoint[], photoRecords: PhotoShapeRecord[], limit = 5) {
  if (points.length < 3 || photoRecords.length === 0) {
    return [];
  }

  return rankPhotoCandidates(points, photoRecords)
    .slice(0, limit)
    .map((entry) => ({
      snake: entry.snake,
      photo: entry.photo,
      score: Math.round(clamp((1 - entry.distance) * 100, 8, 98)),
    }));
}
