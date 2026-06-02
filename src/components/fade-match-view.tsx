"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";

import { boundingBox, clamp } from "@/lib/geometry";
import { buildSvgPath, getPhotoAlignmentFrameStyle } from "@/lib/photo-overlay";
import type { MatchResult, StrokePoint } from "@/lib/types";

type OverlayViewMode = "line" | "photo" | "both";

type FadeMatchViewProps = {
  points: StrokePoint[];
  result: MatchResult | null;
  isMatching: boolean;
  canvasWidth: number;
  canvasHeight: number;
  viewMode: OverlayViewMode;
};

type BoundsData = {
  left: number;
  top: number;
  width: number;
  height: number;
  css: { left: string; top: string; width: string; height: string };
};

function overlayBounds(points: StrokePoint[], canvasWidth: number, canvasHeight: number): BoundsData | null {
  if (points.length < 2) {
    return null;
  }

  const box = boundingBox(points);
  const padding = 26;
  const left = clamp(box.minX - padding, 0, canvasWidth);
  const top = clamp(box.minY - padding, 0, canvasHeight);
  const right = clamp(box.maxX + padding, 0, canvasWidth);
  const bottom = clamp(box.maxY + padding, 0, canvasHeight);
  const width = Math.max(right - left, 48);
  const height = Math.max(bottom - top, 48);

  return {
    left,
    top,
    width,
    height,
    css: {
      left: `${(left / canvasWidth) * 100}%`,
      top: `${(top / canvasHeight) * 100}%`,
      width: `${(width / canvasWidth) * 100}%`,
      height: `${(height / canvasHeight) * 100}%`,
    },
  };
}

function buildUserStrokePath(
  points: StrokePoint[],
  b: { left: number; top: number; width: number; height: number },
): string {
  if (points.length < 2) return "";
  const x = (px: number) => (((px - b.left) / b.width) * 100).toFixed(1);
  const y = (py: number) => (((py - b.top) / b.height) * 100).toFixed(1);
  const cmds = [`M ${x(points[0].x)} ${y(points[0].y)}`];
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    cmds.push(`Q ${x(points[i].x)} ${y(points[i].y)} ${x(mx)} ${y(my)}`);
  }
  const last = points[points.length - 1];
  cmds.push(`L ${x(last.x)} ${y(last.y)}`);
  return cmds.join(" ");
}

export function FadeMatchView({
  points,
  result,
  isMatching,
  canvasWidth,
  canvasHeight,
  viewMode,
}: FadeMatchViewProps) {
  const bounds = overlayBounds(points, canvasWidth, canvasHeight);
  const statusLabel =
    isMatching
      ? "Matching..."
      : result?.score !== undefined && result.score < 58
        ? "Approximate match"
        : result
          ? `${result.confidenceLabel} confidence`
          : null;

  const showPhoto =
    result !== null &&
    bounds !== null &&
    result.overlay.photoAvailable &&
    (viewMode === "photo" || viewMode === "both");
  const showOutline = result !== null && bounds !== null && (viewMode === "both" || viewMode === "line");
  const showStrokeOverlay = result !== null && bounds !== null && (viewMode === "photo" || viewMode === "both");
  const photoFrameStyle = result ? getPhotoAlignmentFrameStyle(result.photo.subjectBounds) : null;
  const outlinePath = result ? buildSvgPath(result.photo.silhouettePolygon, true) : "";
  const userStrokePath = showStrokeOverlay && bounds ? buildUserStrokePath(points, bounds) : "";

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[1.55rem]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(94,124,71,0.18),transparent_42%)]" />

      {statusLabel ? (
        <div className="pointer-events-none absolute right-4 top-4 z-20 rounded-full border border-white/40 bg-[rgba(255,252,244,0.82)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)] shadow-[0_10px_25px_rgba(20,31,17,0.12)]">
          {statusLabel}
        </div>
      ) : null}

      <AnimatePresence>
        {bounds && isMatching ? (
          <motion.div
            key="matching-box"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute rounded-[1.4rem] border border-dashed border-[rgba(49,72,44,0.42)] bg-[rgba(255,252,244,0.16)]"
            style={bounds.css}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {result && bounds ? (
          <motion.div
            key={result.photo.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="pointer-events-none absolute overflow-hidden rounded-[1.2rem]"
            style={bounds.css}
          >
            {showPhoto && photoFrameStyle ? (
              <div className="absolute inset-0 overflow-hidden rounded-[1.2rem] shadow-[0_18px_40px_rgba(20,31,17,0.18)]">
                <div className="absolute" style={photoFrameStyle}>
                  <Image
                    src={result.photo.imagePath}
                    alt={result.snake.commonName}
                    fill
                    unoptimized
                    sizes="100vw"
                    className="object-fill"
                  />
                </div>
              </div>
            ) : null}

            {showOutline && outlinePath ? (
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full overflow-visible"
              >
                <path
                  d={outlinePath}
                  fill="rgba(255,252,244,0.12)"
                  stroke="rgba(255,252,244,0.92)"
                  strokeWidth="1.75"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}

            {showStrokeOverlay && userStrokePath ? (
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 z-20 h-full w-full overflow-visible"
              >
                <path
                  d={userStrokePath}
                  fill="none"
                  stroke="rgba(49, 72, 44, 0.58)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {result ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(19,26,17,0.78)] via-[rgba(19,26,17,0.18)] to-transparent px-5 pb-5 pt-20 text-stone-50 sm:px-6 sm:pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-200/78">
            Closest match
          </p>
          <p className="serif-title mt-2 text-2xl font-semibold sm:text-3xl xl:text-[2.35rem]">
            {result.snake.commonName}
          </p>
          <p className="mt-1 text-sm text-stone-200/82">{result.snake.scientificName}</p>
        </div>
      ) : null}

      {!isMatching && !result && points.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-sm leading-6 text-[var(--muted)] sm:text-base"
        >
          Draw one continuous line, then press match to compare it against extracted snake photo lines.
        </motion.div>
      ) : null}
    </div>
  );
}
