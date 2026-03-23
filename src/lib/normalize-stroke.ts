import { boundingBox, distanceBetween } from "@/lib/geometry";
import type { StrokePoint } from "@/lib/types";

const RESAMPLED_POINT_COUNT = 72;

function cumulativeDistances(points: StrokePoint[]) {
  const distances = [0];

  for (let index = 1; index < points.length; index += 1) {
    distances.push(distances[index - 1] + distanceBetween(points[index - 1], points[index]));
  }

  return distances;
}

function resamplePoints(points: StrokePoint[], targetCount = RESAMPLED_POINT_COUNT) {
  if (points.length === 0) {
    return [];
  }

  if (points.length === 1) {
    return Array.from({ length: targetCount }, (_, index) => ({
      ...points[0],
      t: points[0].t + index,
    }));
  }

  const distances = cumulativeDistances(points);
  const totalLength = distances[distances.length - 1];

  if (totalLength === 0) {
    return Array.from({ length: targetCount }, (_, index) => ({
      ...points[0],
      t: points[0].t + index,
    }));
  }

  const interval = totalLength / (targetCount - 1);
  const resampled: StrokePoint[] = [points[0]];
  let targetDistance = interval;
  let segmentIndex = 1;

  while (segmentIndex < points.length && resampled.length < targetCount - 1) {
    const previousDistance = distances[segmentIndex - 1];
    const currentDistance = distances[segmentIndex];

    if (currentDistance >= targetDistance) {
      const ratio = (targetDistance - previousDistance) / (currentDistance - previousDistance || 1);
      const a = points[segmentIndex - 1];
      const b = points[segmentIndex];

      resampled.push({
        x: a.x + (b.x - a.x) * ratio,
        y: a.y + (b.y - a.y) * ratio,
        t: a.t + (b.t - a.t) * ratio,
      });

      targetDistance += interval;
      continue;
    }

    segmentIndex += 1;
  }

  resampled.push(points[points.length - 1]);

  while (resampled.length < targetCount) {
    resampled.push({ ...points[points.length - 1], t: points[points.length - 1].t + 1 });
  }

  return resampled;
}

function rotate(points: StrokePoint[], angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return points.map((point) => ({
    ...point,
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  }));
}

export function normalizeStroke(points: StrokePoint[]) {
  const resampled = resamplePoints(points);

  if (resampled.length === 0) {
    return [];
  }

  const box = boundingBox(resampled);
  const translated = resampled.map((point) => ({
    ...point,
    x: point.x - box.minX - box.width / 2,
    y: point.y - box.minY - box.height / 2,
  }));

  const start = translated[0];
  const end = translated[translated.length - 1];
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const aligned = rotate(translated, -angle);
  const alignedBox = boundingBox(aligned);
  const scale = Math.max(alignedBox.width, alignedBox.height, 1);

  return aligned.map((point) => ({
    ...point,
    x: point.x / scale,
    y: point.y / scale,
  }));
}
