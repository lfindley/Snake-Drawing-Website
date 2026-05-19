import { getPhotoAlignmentTransform } from "../src/lib/photo-overlay";
import type { NormalizedBounds } from "../src/lib/types";

type AlignmentFixture = {
  id: string;
  subjectBounds: NormalizedBounds;
};

const fixtures: AlignmentFixture[] = [
  {
    id: "centered-subject",
    subjectBounds: { x: 0.2, y: 0.25, width: 0.5, height: 0.4 },
  },
  {
    id: "edge-subject",
    subjectBounds: { x: 0.02, y: 0.08, width: 0.34, height: 0.62 },
  },
];

function mapImagePoint(
  subjectBounds: NormalizedBounds,
  imagePoint: { x: number; y: number },
) {
  const transform = getPhotoAlignmentTransform(subjectBounds);

  return {
    x: transform.frameLeft + imagePoint.x * transform.frameWidth,
    y: transform.frameTop + imagePoint.y * transform.frameHeight,
  };
}

function assertNear(value: number, expected: number, label: string) {
  if (Math.abs(value - expected) > 1e-6) {
    throw new Error(`${label} expected ${expected}, received ${value}`);
  }
}

for (const fixture of fixtures) {
  const topLeft = mapImagePoint(fixture.subjectBounds, {
    x: fixture.subjectBounds.x,
    y: fixture.subjectBounds.y,
  });
  const bottomRight = mapImagePoint(fixture.subjectBounds, {
    x: fixture.subjectBounds.x + fixture.subjectBounds.width,
    y: fixture.subjectBounds.y + fixture.subjectBounds.height,
  });

  assertNear(topLeft.x, 0, `${fixture.id} top-left x`);
  assertNear(topLeft.y, 0, `${fixture.id} top-left y`);
  assertNear(bottomRight.x, 1, `${fixture.id} bottom-right x`);
  assertNear(bottomRight.y, 1, `${fixture.id} bottom-right y`);

  console.log(`[overlay] ${fixture.id} passed`);
}

console.log(`[overlay] ${fixtures.length} alignment fixtures passed.`);
