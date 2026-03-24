export type StrokePoint = {
  x: number;
  y: number;
  t: number;
};

export type NormalizedPathPoint = {
  x: number;
  y: number;
};

export type StrokeFeatures = {
  pathLength: number;
  aspectRatio: number;
  curvature: number;
  turnVariance: number;
  waviness: number;
};

export type SnakeShapeProfile = StrokeFeatures;

export type SilhouetteFeatures = {
  aspectRatio: number;
  fillRatio: number;
  compactness: number;
  huMoments: number[];
};

export type PhotoLineFeatures = StrokeFeatures;

export type FeatureBreakdown = {
  key: string;
  label: string;
  strokeValue: number;
  candidateValue: number;
  similarity: number;
};

export type PhotoShapeRecord = {
  id: string;
  snakeId: string;
  fileName: string;
  imagePath: string;
  width: number;
  height: number;
  usable: boolean;
  qualityScore: number;
  extractionNotes: string[];
  features: SilhouetteFeatures;
  silhouettePolygon: NormalizedPathPoint[];
  linePoints: NormalizedPathPoint[];
  lineFeatures: PhotoLineFeatures;
  lineQualityScore: number;
  lineUsable: boolean;
};

export type PhotoShapeDataset = {
  generatedAt: string;
  totalImages: number;
  usableImages: number;
  records: PhotoShapeRecord[];
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
  photo: PhotoShapeRecord;
  score: number;
  confidenceLabel: "Low" | "Moderate" | "Strong";
  featureBreakdown: FeatureBreakdown[];
  overlay: {
    silhouetteAvailable: boolean;
    photoAvailable: boolean;
    lineAvailable: boolean;
  };
};
