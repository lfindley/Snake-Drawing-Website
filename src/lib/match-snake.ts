import { snakeProfiles } from "@/data/snakes";
import { extractStrokeFeatures } from "@/lib/extract-features";
import { clamp } from "@/lib/geometry";
import {
  buildNormalizedPathMask,
  buildNormalizedPolygonOutlineMask,
  extractStrokeSilhouetteFeatures,
  maskIntersectionOverUnion,
} from "@/lib/mask-shape";
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

const photoSilhouetteMaskCache = new Map<string, Uint8Array>();

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

function speciesProfileDistance(strokeFeatures: StrokeFeatures, snakeId: string) {
  const snake = snakeProfiles.find((entry) => entry.id === snakeId);
  if (!snake) {
    return 1;
  }

  return lineFeatureDistance(strokeFeatures, snake.shapeProfile);
}

function getPhotoSilhouetteMask(photo: PhotoShapeRecord) {
  const cached = photoSilhouetteMaskCache.get(photo.id);
  if (cached) {
    return cached;
  }

  const mask = buildNormalizedPolygonOutlineMask(photo.matchSilhouettePolygon);
  photoSilhouetteMaskCache.set(photo.id, mask);
  return mask;
}

function buildBreakdown(args: {
  linePathDistance: number;
  silhouetteDistance: number;
  lineFeaturesDistance: number;
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
      key: "silhouetteOverlap",
      label: "Outline overlap",
      strokeValue: 1,
      candidateValue: 1 - args.silhouetteDistance,
      similarity: clamp(1 - args.silhouetteDistance, 0, 1),
    },
    {
      key: "lineFeatures",
      label: "Line feature blend",
      strokeValue: 1,
      candidateValue: 1 - args.lineFeaturesDistance,
      similarity: clamp(1 - args.lineFeaturesDistance, 0, 1),
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
      key: "silhouetteCompactness",
      label: "Stroke compactness",
      strokeValue: args.strokeSilhouetteFeatures.compactness,
      candidateValue: args.photo.features.compactness,
      similarity: clamp(
        1 - normalizedDifference(args.strokeSilhouetteFeatures.compactness, args.photo.features.compactness),
        0,
        1,
      ),
    },
  ];

  return entries.sort((a, b) => b.similarity - a.similarity);
}

type MatchScore = {
  distance: number;
  linePathDistance: number;
  silhouetteDistance: number;
  lineFeaturesDistance: number;
  breakdown: FeatureBreakdown[];
};

function scorePhotoMatch(args: {
  strokePath: StrokePoint[];
  strokeMask: Uint8Array;
  strokeLineFeatures: StrokeFeatures;
  strokeSilhouetteFeatures: ReturnType<typeof extractStrokeSilhouetteFeatures>;
  photo: PhotoShapeRecord;
}): MatchScore {
  const { strokePath, strokeMask, strokeLineFeatures, strokeSilhouetteFeatures, photo } = args;
  const linePoints = toStrokePoints(photo.linePoints);
  const hasLineGeometry = photo.lineUsable && linePoints.length > 2;
  const hasSilhouetteGeometry = photo.matchSilhouettePolygon.length > 2;
  const linePathDistance = hasLineGeometry ? compareNormalizedPaths(strokePath, linePoints) : 1;
  const lineFeaturesDistance = hasLineGeometry
    ? lineFeatureDistance(strokeLineFeatures, photo.lineFeatures)
    : 1;
  const silhouetteDistance = hasSilhouetteGeometry
    ? 1 - maskIntersectionOverUnion(strokeMask, getPhotoSilhouetteMask(photo))
    : 1;

  let distance = 1;

  if (hasLineGeometry && hasSilhouetteGeometry) {
    distance = linePathDistance * 0.6 + silhouetteDistance * 0.3 + lineFeaturesDistance * 0.1;
  } else {
    const profileDistance = speciesProfileDistance(strokeLineFeatures, photo.snakeId);
    const fallbackGeometryDistance = hasLineGeometry
      ? linePathDistance * 0.7 + lineFeaturesDistance * 0.2
      : hasSilhouetteGeometry
        ? silhouetteDistance * 0.8 + lineFeaturesDistance * 0.05
        : 1;

    distance = fallbackGeometryDistance + profileDistance * 0.1;
  }

  return {
    distance,
    linePathDistance,
    silhouetteDistance,
    lineFeaturesDistance,
    breakdown: buildBreakdown({
      linePathDistance,
      silhouetteDistance,
      lineFeaturesDistance,
      strokeLineFeatures,
      photo,
      strokeSilhouetteFeatures,
    }),
  };
}

function rankPhotoCandidates(points: StrokePoint[], photoRecords: PhotoShapeRecord[]) {
  const strokePath = normalizeStroke(points);
  const strokeMask = buildNormalizedPathMask(strokePath);
  const strokeLineFeatures = extractStrokeFeatures(strokePath);
  const strokeSilhouetteFeatures = extractStrokeSilhouetteFeatures(points);

  const bestBySpecies = new Map<
    string,
    {
      snake: MatchResult["snake"];
      photo: PhotoShapeRecord;
      distance: number;
      linePathDistance: number;
      silhouetteDistance: number;
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
      strokeMask,
      strokeLineFeatures,
      strokeSilhouetteFeatures,
      photo,
    });

    const existing = bestBySpecies.get(photo.snakeId);
    const shouldReplace =
      !existing ||
      scored.distance < existing.distance - 1e-6 ||
      (Math.abs(scored.distance - existing.distance) <= 1e-6 &&
        (scored.linePathDistance < existing.linePathDistance - 1e-6 ||
          (Math.abs(scored.linePathDistance - existing.linePathDistance) <= 1e-6 &&
            (scored.silhouetteDistance < existing.silhouetteDistance - 1e-6 ||
              (Math.abs(scored.silhouetteDistance - existing.silhouetteDistance) <= 1e-6 &&
                photo.qualityScore > existing.photo.qualityScore)))));

    if (shouldReplace) {
      bestBySpecies.set(photo.snakeId, {
        snake,
        photo,
        distance: scored.distance,
        linePathDistance: scored.linePathDistance,
        silhouetteDistance: scored.silhouetteDistance,
        breakdown: scored.breakdown,
      });
    }
  });

  return Array.from(bestBySpecies.values()).sort((a, b) => {
    if (Math.abs(a.distance - b.distance) > 1e-6) {
      return a.distance - b.distance;
    }

    if (Math.abs(a.linePathDistance - b.linePathDistance) > 1e-6) {
      return a.linePathDistance - b.linePathDistance;
    }

    if (Math.abs(a.silhouetteDistance - b.silhouetteDistance) > 1e-6) {
      return a.silhouetteDistance - b.silhouetteDistance;
    }

    return b.photo.qualityScore - a.photo.qualityScore;
  });
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
      silhouetteAvailable: best.photo.matchSilhouettePolygon.length > 2,
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
