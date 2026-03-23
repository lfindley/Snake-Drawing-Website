"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";

import { normalizeStroke } from "@/lib/normalize-stroke";
import type { MatchResult, StrokePoint } from "@/lib/types";

type FadeMatchViewProps = {
  points: StrokePoint[];
  result: MatchResult | null;
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

export function FadeMatchView({ points, result }: FadeMatchViewProps) {
  const polyline = buildPolyline(points);
  const statusLabel =
    result?.score !== undefined && result.score < 58
      ? "Approximate match"
      : result
        ? `${result.confidenceLabel} confidence`
        : null;

  return (
    <div className="section-shell relative overflow-hidden rounded-[1.8rem] p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
            Transition
          </p>
          <h3 className="serif-title mt-2 text-2xl font-semibold text-[var(--accent-strong)] xl:text-3xl">
            Sketch to species reveal
          </h3>
        </div>
        {statusLabel ? (
          <span className="rounded-full border border-[var(--line)] bg-white/72 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            {statusLabel}
          </span>
        ) : null}
      </div>

      <div className="relative aspect-[16/11] overflow-hidden rounded-[1.55rem] border border-[rgba(49,72,44,0.14)] bg-[linear-gradient(135deg,rgba(240,231,210,0.96),rgba(246,240,225,0.86))] xl:aspect-[16/10]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(94,124,71,0.18),transparent_42%)]" />
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key={result.snake.id}
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <motion.div
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="absolute inset-0 p-6"
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

              <motion.div
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.95, delay: 0.18, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <Image
                  src={result.snake.image}
                  alt={result.snake.commonName}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </motion.div>

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(24,29,20,0.84)] via-[rgba(24,29,20,0.34)] to-transparent px-6 pb-6 pt-20 text-stone-50">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-200/80">
                  Closest match
                </p>
                <p className="serif-title mt-2 text-2xl font-semibold xl:text-[2.15rem]">
                  {result.snake.commonName}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm leading-6 text-[var(--muted)]"
            >
              Submit a drawing to see your stroke fade into the chosen species photo.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
