import { snakeProfiles } from "@/data/snakes";
import { extractStrokeFeatures } from "@/lib/extract-features";
import { clamp } from "@/lib/geometry";
import { normalizeStroke } from "@/lib/normalize-stroke";
import type { FeatureBreakdown, MatchResult, StrokeFeatures, StrokePoint } from "@/lib/types";

const featureWeights: Record<keyof StrokeFeatures, number> = {
  pathLength: 0.18,
  aspectRatio: 0.27,
  curvature: 0.24,
  turnVariance: 0.11,
  waviness: 0.2,
};

const featureLabels: Record<keyof StrokeFeatures, string> = {
  pathLength: "Path length",
  aspectRatio: "Body ratio",
  curvature: "Curvature",
  turnVariance: "Turn rhythm",
  waviness: "Waviness",
};

function normalizedDifference(a: number, b: number) {
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1);
}

function confidenceLabel(score: number): MatchResult["confidenceLabel"] {
  if (score >= 80) {
    return "Strong";
  }

  if (score >= 58) {
    return "Moderate";
  }

  return "Low";
}

function buildBreakdown(
  strokeFeatures: StrokeFeatures,
  snakeFeatures: StrokeFeatures,
): FeatureBreakdown[] {
  return (Object.keys(featureWeights) as Array<keyof StrokeFeatures>)
    .map((key) => {
      const similarity = 1 - normalizedDifference(strokeFeatures[key], snakeFeatures[key]);
      return {
        key,
        label: featureLabels[key],
        strokeValue: strokeFeatures[key],
        snakeValue: snakeFeatures[key],
        similarity: clamp(similarity, 0, 1),
      };
    })
    .sort((a, b) => b.similarity - a.similarity);
}

export function matchSnake(points: StrokePoint[]): MatchResult | null {
  if (points.length < 3) {
    return null;
  }

  const normalizedPoints = normalizeStroke(points);
  const strokeFeatures = extractStrokeFeatures(normalizedPoints);

  const candidates = snakeProfiles.map((snake) => {
    const distance = (Object.keys(featureWeights) as Array<keyof StrokeFeatures>).reduce(
      (total, key) => {
        return (
          total +
          normalizedDifference(strokeFeatures[key], snake.shapeProfile[key]) * featureWeights[key]
        );
      },
      0,
    );

    return {
      snake,
      distance,
      breakdown: buildBreakdown(strokeFeatures, snake.shapeProfile),
    };
  });

  const ranked = candidates.sort((a, b) => a.distance - b.distance);
  const best = ranked[0];

  if (!best) {
    return null;
  }

  const score = Math.round(clamp((1 - best.distance) * 100, 8, 98));

  return {
    snake: best.snake,
    score,
    confidenceLabel: confidenceLabel(score),
    featureBreakdown: best.breakdown,
  };
}

export function rankSnakeMatches(points: StrokePoint[], limit = 5) {
  if (points.length < 3) {
    return [];
  }

  const normalizedPoints = normalizeStroke(points);
  const strokeFeatures = extractStrokeFeatures(normalizedPoints);

  return snakeProfiles
    .map((snake) => {
      const distance = (Object.keys(featureWeights) as Array<keyof StrokeFeatures>).reduce(
        (total, key) => {
          return (
            total +
            normalizedDifference(strokeFeatures[key], snake.shapeProfile[key]) * featureWeights[key]
          );
        },
        0,
      );

      return {
        snake,
        score: Math.round(clamp((1 - distance) * 100, 8, 98)),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
