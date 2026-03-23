"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";

import { normalizeStroke } from "@/lib/normalize-stroke";
import type { MatchResult, StrokePoint } from "@/lib/types";

type FadeMatchViewProps = {
  points: StrokePoint[];
  result: MatchResult | null;
  isMatching: boolean;
};

function buildPolyline(points: StrokePoint[]) {
  const normalized = normalizeStroke(points);

  if (normalized.length === 0) {
    return "";
  }

  return normalized
    .map((point) => `${(point.x + 0.5) * 100},${(point.y + 0.5) * 100}`)
    .join(" ");
}

export function FadeMatchView({ points, result, isMatching }: FadeMatchViewProps) {
  const polyline = buildPolyline(points);
  const hasStroke = polyline.length > 0;
  const statusLabel =
    isMatching
      ? "Matching..."
      : result?.score !== undefined && result.score < 58
      ? "Approximate match"
      : result
        ? `${result.confidenceLabel} confidence`
        : null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.55rem]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(94,124,71,0.18),transparent_42%)]" />

      {statusLabel ? (
        <div className="absolute right-4 top-4 z-20 rounded-full border border-white/40 bg-[rgba(255,252,244,0.82)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)] shadow-[0_10px_25px_rgba(20,31,17,0.12)]">
          {statusLabel}
        </div>
      ) : null}

      <AnimatePresence>
        {(isMatching || result) && hasStroke ? (
          <motion.div
            key={`stroke-${result?.snake.id ?? "matching"}`}
            initial={{ opacity: 0.92, scale: 1 }}
            animate={{ opacity: result ? 0 : 1, scale: result ? 0.975 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: "easeInOut" }}
            className="absolute inset-0 p-6 sm:p-8"
          >
            <svg viewBox="0 0 100 100" className="h-full w-full">
              <polyline
                points={polyline}
                fill="none"
                stroke="#30452d"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {result ? (
          <motion.div
            key={result.snake.id}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, delay: 0.12, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <Image
              src={result.photo.imagePath}
              alt={`${result.snake.commonName} reference photo`}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 70vw"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(19,26,17,0.9)] via-[rgba(19,26,17,0.36)] to-transparent px-5 pb-5 pt-20 text-stone-50 sm:px-6 sm:pb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-200/78">
                Closest match
              </p>
              <p className="serif-title mt-2 text-2xl font-semibold sm:text-3xl xl:text-[2.35rem]">
                {result.snake.commonName}
              </p>
              <p className="mt-1 text-sm text-stone-200/82">{result.snake.scientificName}</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!isMatching && !result && !hasStroke ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm leading-6 text-[var(--muted)] sm:text-base"
        >
          Draw a single continuous line, then press match to reveal the closest snake in this same frame.
        </motion.div>
      ) : null}
    </div>
  );
}
