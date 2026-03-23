export type StrokePoint = {
  x: number;
  y: number;
  t: number;
};

export type StrokeFeatures = {
  pathLength: number;
  aspectRatio: number;
  curvature: number;
  turnVariance: number;
  waviness: number;
};

export type SnakeShapeProfile = StrokeFeatures;

export type FeatureBreakdown = {
  key: keyof StrokeFeatures;
  label: string;
  strokeValue: number;
  snakeValue: number;
  similarity: number;
};

export type SnakeProfile = {
  id: string;
  commonName: string;
  scientificName: string;
  image: string;
  habitat: string | null;
  region: string | null;
  venomous: boolean | null;
  facts: string[];
  shapeProfile: SnakeShapeProfile;
  isFeatured: boolean;
};

export type MatchResult = {
  snake: SnakeProfile;
  score: number;
  confidenceLabel: "Low" | "Moderate" | "Strong";
  featureBreakdown: FeatureBreakdown[];
};
