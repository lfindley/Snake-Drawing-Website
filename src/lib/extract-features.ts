import { boundingBox, clamp, pathLength, standardDeviation } from "@/lib/geometry";
import type { StrokeFeatures, StrokePoint } from "@/lib/types";

function angleDelta(previous: StrokePoint, current: StrokePoint, next: StrokePoint) {
  const angleA = Math.atan2(current.y - previous.y, current.x - previous.x);
  const angleB = Math.atan2(next.y - current.y, next.x - current.x);
  const delta = angleB - angleA;

  return Math.atan2(Math.sin(delta), Math.cos(delta));
}

function countSignChanges(values: number[]) {
  let signChanges = 0;
  let previousSign = 0;

  values.forEach((value) => {
    const sign = Math.sign(value);
    if (sign !== 0 && previousSign !== 0 && sign !== previousSign) {
      signChanges += 1;
    }
    if (sign !== 0) {
      previousSign = sign;
    }
  });

  return signChanges;
}

export function extractStrokeFeatures(points: StrokePoint[]): StrokeFeatures {
  if (points.length < 3) {
    return {
      pathLength: 0,
      aspectRatio: 1,
      curvature: 0,
      turnVariance: 0,
      waviness: 0,
    };
  }

  const bounds = boundingBox(points);
  const totalLength = pathLength(points);
  const turningAngles: number[] = [];
  const perpDeltas: number[] = [];

  for (let index = 1; index < points.length - 1; index += 1) {
    turningAngles.push(Math.abs(angleDelta(points[index - 1], points[index], points[index + 1])));
    // Perpendicular deviation from the local travel direction (direction-agnostic waviness)
    const dx = points[index + 1].x - points[index - 1].x;
    const dy = points[index + 1].y - points[index - 1].y;
    const len = Math.hypot(dx, dy) || 1;
    const ex = points[index].x - points[index - 1].x;
    const ey = points[index].y - points[index - 1].y;
    perpDeltas.push((ex * -dy + ey * dx) / len);
  }

  const aspectRatio = bounds.height <= 0.0001 ? bounds.width : bounds.width / bounds.height;
  const curvature =
    turningAngles.reduce((sum, angle) => sum + angle, 0) /
    (Math.PI * Math.max(turningAngles.length, 1));
  const turnVariance = standardDeviation(turningAngles) / Math.PI;
  const waviness = countSignChanges(perpDeltas) / Math.max(perpDeltas.length, 1);

  return {
    pathLength: clamp(totalLength, 0, 4),
    aspectRatio: clamp(aspectRatio, 0.5, 8),
    curvature: clamp(curvature, 0, 1),
    turnVariance: clamp(turnVariance, 0, 1),
    waviness: clamp(waviness, 0, 1),
  };
}
