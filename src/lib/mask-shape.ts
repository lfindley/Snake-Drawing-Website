import { clamp } from "@/lib/geometry";
import { normalizeStroke } from "@/lib/normalize-stroke";
import type { NormalizedPathPoint, SilhouetteFeatures, StrokePoint } from "@/lib/types";

const MASK_SIZE = 96;
const DRAW_RADIUS = 4;

type MaskBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function createMask(size: number) {
  return new Uint8Array(size * size);
}

function setPixel(mask: Uint8Array, size: number, x: number, y: number) {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return;
  }

  mask[y * size + x] = 1;
}

function drawDisc(mask: Uint8Array, size: number, x: number, y: number, radius: number) {
  for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
    for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
      if (offsetX * offsetX + offsetY * offsetY <= radius * radius) {
        setPixel(mask, size, Math.round(x + offsetX), Math.round(y + offsetY));
      }
    }
  }
}

function rasterizeSegment(
  mask: Uint8Array,
  size: number,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  radius: number,
) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);

  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    drawDisc(mask, size, fromX + dx * progress, fromY + dy * progress, radius);
  }
}

function projectLineSpaceValue(value: number, padding: number, drawableSize: number) {
  return padding + (value + 0.5) * drawableSize;
}

function projectLineSpacePoints(
  points: Array<Pick<NormalizedPathPoint, "x" | "y">>,
  size: number,
  padding: number,
) {
  const drawableSize = size - padding * 2 - 1;

  return points.map((point) => ({
    x: projectLineSpaceValue(point.x, padding, drawableSize),
    y: projectLineSpaceValue(point.y, padding, drawableSize),
  }));
}

function pointInPolygon(
  pointX: number,
  pointY: number,
  polygon: Array<Pick<NormalizedPathPoint, "x" | "y">>,
) {
  let inside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const current = polygon[index];
    const prior = polygon[previous];
    const denominator = prior.y - current.y || (prior.y >= current.y ? 1e-9 : -1e-9);
    const intersects =
      current.y > pointY !== prior.y > pointY &&
      pointX < ((prior.x - current.x) * (pointY - current.y)) / denominator + current.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function fillPolygon(
  mask: Uint8Array,
  size: number,
  polygon: Array<Pick<NormalizedPathPoint, "x" | "y">>,
) {
  if (polygon.length < 3) {
    return;
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (pointInPolygon(x + 0.5, y + 0.5, polygon)) {
        setPixel(mask, size, x, y);
      }
    }
  }
}

function findMaskBounds(mask: Uint8Array, size: number): MaskBounds | null {
  let minX = size;
  let minY = size;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (mask[y * size + x] === 0) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < 0 || maxY < 0) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

function computePerimeter(mask: Uint8Array, size: number) {
  let perimeter = 0;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (mask[y * size + x] === 0) {
        continue;
      }

      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ];

      neighbors.forEach(([neighborX, neighborY]) => {
        if (
          neighborX < 0 ||
          neighborY < 0 ||
          neighborX >= size ||
          neighborY >= size ||
          mask[neighborY * size + neighborX] === 0
        ) {
          perimeter += 1;
        }
      });
    }
  }

  return perimeter;
}

function logHuMoment(value: number) {
  if (!Number.isFinite(value) || value === 0) {
    return 0;
  }

  return -Math.sign(value) * Math.log10(Math.abs(value));
}

function computeHuMoments(mask: Uint8Array, size: number) {
  let m00 = 0;
  let m10 = 0;
  let m01 = 0;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const value = mask[y * size + x];
      if (value === 0) {
        continue;
      }

      m00 += 1;
      m10 += x;
      m01 += y;
    }
  }

  if (m00 === 0) {
    return Array.from({ length: 7 }, () => 0);
  }

  const xBar = m10 / m00;
  const yBar = m01 / m00;

  let mu11 = 0;
  let mu20 = 0;
  let mu02 = 0;
  let mu30 = 0;
  let mu03 = 0;
  let mu12 = 0;
  let mu21 = 0;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const value = mask[y * size + x];
      if (value === 0) {
        continue;
      }

      const dx = x - xBar;
      const dy = y - yBar;

      mu11 += dx * dy;
      mu20 += dx ** 2;
      mu02 += dy ** 2;
      mu30 += dx ** 3;
      mu03 += dy ** 3;
      mu12 += dx * dy ** 2;
      mu21 += dx ** 2 * dy;
    }
  }

  const normalize = (mu: number, p: number, q: number) =>
    mu / Math.max(m00 ** (1 + (p + q) / 2), 1);

  const eta11 = normalize(mu11, 1, 1);
  const eta20 = normalize(mu20, 2, 0);
  const eta02 = normalize(mu02, 0, 2);
  const eta30 = normalize(mu30, 3, 0);
  const eta03 = normalize(mu03, 0, 3);
  const eta12 = normalize(mu12, 1, 2);
  const eta21 = normalize(mu21, 2, 1);

  const hu = [
    eta20 + eta02,
    (eta20 - eta02) ** 2 + 4 * eta11 ** 2,
    (eta30 - 3 * eta12) ** 2 + (3 * eta21 - eta03) ** 2,
    (eta30 + eta12) ** 2 + (eta21 + eta03) ** 2,
    (eta30 - 3 * eta12) *
      (eta30 + eta12) *
      ((eta30 + eta12) ** 2 - 3 * (eta21 + eta03) ** 2) +
      (3 * eta21 - eta03) *
        (eta21 + eta03) *
        (3 * (eta30 + eta12) ** 2 - (eta21 + eta03) ** 2),
    (eta20 - eta02) * ((eta30 + eta12) ** 2 - (eta21 + eta03) ** 2) +
      4 * eta11 * (eta30 + eta12) * (eta21 + eta03),
    (3 * eta21 - eta03) *
      (eta30 + eta12) *
      ((eta30 + eta12) ** 2 - 3 * (eta21 + eta03) ** 2) -
      (eta30 - 3 * eta12) *
        (eta21 + eta03) *
        (3 * (eta30 + eta12) ** 2 - (eta21 + eta03) ** 2),
  ];

  return hu.map(logHuMoment);
}

export function extractMaskShapeFeatures(mask: Uint8Array, size = MASK_SIZE): SilhouetteFeatures {
  const bounds = findMaskBounds(mask, size);

  if (!bounds) {
    return {
      aspectRatio: 1,
      fillRatio: 0,
      compactness: 0,
      huMoments: Array.from({ length: 7 }, () => 0),
    };
  }

  const width = Math.max(bounds.maxX - bounds.minX + 1, 1);
  const height = Math.max(bounds.maxY - bounds.minY + 1, 1);

  let area = 0;
  for (let index = 0; index < mask.length; index += 1) {
    area += mask[index];
  }

  const perimeter = computePerimeter(mask, size);
  const bboxArea = width * height;

  return {
    aspectRatio: clamp(width / height, 0.25, 12),
    fillRatio: clamp(area / Math.max(bboxArea, 1), 0, 1),
    compactness: clamp((4 * Math.PI * area) / Math.max(perimeter * perimeter, 1), 0, 1),
    huMoments: computeHuMoments(mask, size),
  };
}

export function buildNormalizedStrokeMask(points: StrokePoint[], size = MASK_SIZE) {
  const normalizedPoints = normalizeStroke(points);
  return buildNormalizedPathMask(normalizedPoints, size);
}

export function buildNormalizedPathMask(
  points: Array<Pick<NormalizedPathPoint, "x" | "y">>,
  size = MASK_SIZE,
  radius = DRAW_RADIUS,
) {
  const mask = createMask(size);
  if (points.length < 2) {
    return mask;
  }

  const padding = radius * 3;
  const projectedPoints = projectLineSpacePoints(points, size, padding);

  for (let index = 1; index < projectedPoints.length; index += 1) {
    const previous = projectedPoints[index - 1];
    const current = projectedPoints[index];

    rasterizeSegment(
      mask,
      size,
      previous.x,
      previous.y,
      current.x,
      current.y,
      radius,
    );
  }

  return mask;
}

export function buildNormalizedPolygonMask(
  polygon: Array<Pick<NormalizedPathPoint, "x" | "y">>,
  size = MASK_SIZE,
) {
  const mask = createMask(size);
  if (polygon.length < 3) {
    return mask;
  }

  const padding = DRAW_RADIUS * 3;
  const projectedPolygon = projectLineSpacePoints(polygon, size, padding);

  fillPolygon(mask, size, projectedPolygon);

  for (let index = 0; index < projectedPolygon.length; index += 1) {
    const current = projectedPolygon[index];
    const next = projectedPolygon[(index + 1) % projectedPolygon.length];
    rasterizeSegment(mask, size, current.x, current.y, next.x, next.y, 1);
  }

  return mask;
}

export function buildNormalizedPolygonOutlineMask(
  polygon: Array<Pick<NormalizedPathPoint, "x" | "y">>,
  size = MASK_SIZE,
  radius = DRAW_RADIUS,
) {
  const mask = createMask(size);
  if (polygon.length < 3) {
    return mask;
  }

  const padding = radius * 3;
  const projectedPolygon = projectLineSpacePoints(polygon, size, padding);

  for (let index = 0; index < projectedPolygon.length; index += 1) {
    const current = projectedPolygon[index];
    const next = projectedPolygon[(index + 1) % projectedPolygon.length];
    rasterizeSegment(mask, size, current.x, current.y, next.x, next.y, radius);
  }

  return mask;
}

export function maskIntersectionOverUnion(maskA: Uint8Array, maskB: Uint8Array) {
  if (maskA.length !== maskB.length) {
    return 0;
  }

  let intersection = 0;
  let union = 0;

  for (let index = 0; index < maskA.length; index += 1) {
    const a = maskA[index] > 0;
    const b = maskB[index] > 0;

    if (a && b) {
      intersection += 1;
    }

    if (a || b) {
      union += 1;
    }
  }

  return union === 0 ? 0 : intersection / union;
}

export function extractStrokeSilhouetteFeatures(points: StrokePoint[], size = MASK_SIZE) {
  if (points.length < 2) {
    return extractMaskShapeFeatures(createMask(size), size);
  }

  const mask = buildNormalizedStrokeMask(points, size);

  return extractMaskShapeFeatures(mask, size);
}
