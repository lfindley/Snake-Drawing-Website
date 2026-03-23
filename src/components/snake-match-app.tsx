"use client";

import { useState, useTransition } from "react";

import { CanvasControls } from "@/components/canvas-controls";
import { DrawingCanvas } from "@/components/drawing-canvas";
import { FadeMatchView } from "@/components/fade-match-view";
import { ResultPanel } from "@/components/result-panel";
import { featuredSnakeProfiles, snakeProfiles } from "@/data/snakes";
import { matchSnake } from "@/lib/match-snake";
import type { MatchResult, StrokePoint } from "@/lib/types";

function wait(duration: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

export function SnakeMatchApp() {
  const [points, setPoints] = useState<StrokePoint[]>([]);
  const [matchedStroke, setMatchedStroke] = useState<StrokePoint[]>([]);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = points.length > 2;

  const handleClear = () => {
    setPoints([]);
    setMatchedStroke([]);
    setResult(null);
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    setMatchedStroke(points);

    startTransition(async () => {
      await wait(850);
      const nextResult = matchSnake(points);
      setResult(nextResult);
    });
  };

  return (
    <section className="px-5 pb-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[94rem]">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.42fr)_minmax(22rem,0.58fr)]">
          <div className="section-shell rounded-[2rem] p-5 sm:p-6 xl:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
                  Drawing workspace
                </p>
                <h2 className="serif-title mt-2 text-3xl font-semibold text-[var(--accent-strong)] xl:text-4xl">
                  Sketch a snake silhouette
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)] xl:text-[1.02rem]">
                  The matcher compares line length, ratio, curvature, turning rhythm,
                  and waviness against {snakeProfiles.length} local species profiles.
                </p>
              </div>
              <CanvasControls
                canSubmit={canSubmit}
                isMatching={isPending}
                onClear={handleClear}
                onSubmit={handleSubmit}
              />
            </div>

            <div className="mt-5">
              <DrawingCanvas points={points} onChange={setPoints} />
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-3">
              <div className="rounded-[1.25rem] border border-[var(--line)] bg-white/66 px-4 py-4 text-sm leading-6 text-[var(--muted)]">
                Longer, ribbon-like strokes tend to rank garter, ribbon, and green snakes higher.
              </div>
              <div className="rounded-[1.25rem] border border-[var(--line)] bg-white/66 px-4 py-4 text-sm leading-6 text-[var(--muted)]">
                Compact, thicker turns usually push the score toward vipers, hognose snakes, and rattlesnakes.
              </div>
              <div className="rounded-[1.25rem] border border-[var(--line)] bg-white/66 px-4 py-4 text-sm leading-6 text-[var(--muted)]">
                Broad, smooth curves favor kingsnakes, corn snakes, rat snakes, and gopher snakes.
              </div>
            </div>
          </div>

          <div className="section-shell rounded-[2rem] p-5 sm:p-6 xl:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
              Side rail
            </p>
            <h2 className="serif-title mt-2 text-3xl font-semibold text-[var(--accent-strong)] xl:text-4xl">
              Featured species for the MVP
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              The full image corpus is loaded locally. These featured snakes have the most
              complete educational notes and hand-tuned shape profiles.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {featuredSnakeProfiles.map((snake) => (
                <span
                  key={snake.id}
                  className="rounded-full border border-[var(--line)] bg-white/72 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]"
                >
                  {snake.commonName}
                </span>
              ))}
            </div>
            <div className="mt-6 rounded-[1.35rem] border border-[var(--line)] bg-white/68 p-4 text-sm leading-7 text-[var(--muted)]">
              Low scores are shown as approximate matches. The heuristic engine is calibrated for
              desktop drawing space first, where longer strokes and smoother arm movement produce
              better signals.
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)]">
          <FadeMatchView points={matchedStroke} result={result} />
          <ResultPanel result={result} />
        </div>
      </div>
    </section>
  );
}
