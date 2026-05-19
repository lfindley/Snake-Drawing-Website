import type { NormalizedBounds, NormalizedPathPoint } from "@/lib/types";

const MIN_SUBJECT_SIZE = 1e-4;

export type PhotoAlignmentTransform = {
  frameLeft: number;
  frameTop: number;
  frameWidth: number;
  frameHeight: number;
};

function clampSubjectBounds(subjectBounds: NormalizedBounds): NormalizedBounds {
  const width = Math.max(subjectBounds.width, MIN_SUBJECT_SIZE);
  const height = Math.max(subjectBounds.height, MIN_SUBJECT_SIZE);
  const x = Math.min(Math.max(subjectBounds.x, 0), 1 - width);
  const y = Math.min(Math.max(subjectBounds.y, 0), 1 - height);

  return {
    x,
    y,
    width,
    height,
  };
}

export function getPhotoAlignmentTransform(subjectBounds: NormalizedBounds): PhotoAlignmentTransform {
  const bounds = clampSubjectBounds(subjectBounds);

  return {
    frameLeft: -bounds.x / bounds.width,
    frameTop: -bounds.y / bounds.height,
    frameWidth: 1 / bounds.width,
    frameHeight: 1 / bounds.height,
  };
}

export function getPhotoAlignmentFrameStyle(subjectBounds: NormalizedBounds) {
  const transform = getPhotoAlignmentTransform(subjectBounds);

  return {
    left: `${transform.frameLeft * 100}%`,
    top: `${transform.frameTop * 100}%`,
    width: `${transform.frameWidth * 100}%`,
    height: `${transform.frameHeight * 100}%`,
  };
}

export function buildSvgPath(points: NormalizedPathPoint[], closed = false) {
  if (points.length === 0) {
    return "";
  }

  const [first, ...rest] = points;
  const commands = [`M ${first.x * 100} ${first.y * 100}`];

  rest.forEach((point) => {
    commands.push(`L ${point.x * 100} ${point.y * 100}`);
  });

  if (closed) {
    commands.push("Z");
  }

  return commands.join(" ");
}
