"use client";

import { useEffect, useRef, useState } from "react";

import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/components/drawing-canvas";
import { CanvasControls } from "@/components/canvas-controls";
import { loadUsablePhotoShapeRecords, photoShapeManifest } from "@/data/photo-shapes";
import { DrawingCanvas } from "@/components/drawing-canvas";
import { FadeMatchView } from "@/components/fade-match-view";
import { featuredSnakeProfiles } from "@/data/snakes";
import { matchSnake } from "@/lib/match-snake";
import type { MatchResult, PhotoShapeRecord, StrokePoint } from "@/lib/types";

const MATCH_DELAY_MS = 850;
type OverlayViewMode = "line" | "silhouette" | "photo" | "both";

export function SnakeMatchApp() {
  const [points, setPoints] = useState<StrokePoint[]>([]);
  const [matchedStroke, setMatchedStroke] = useState<StrokePoint[]>([]);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [viewMode, setViewMode] = useState<OverlayViewMode>("both");
  const [photoRecords, setPhotoRecords] = useState<PhotoShapeRecord[]>([]);
  const [datasetReady, setDatasetReady] = useState(false);
  const matchTimerRef = useRef<number | null>(null);

  const canSubmit = points.length > 2 && datasetReady;
  const hasResult = result !== null;
  const compactFacts = result?.snake.facts.slice(0, 2) ?? [];

  const clearPendingMatch = () => {
    if (matchTimerRef.current !== null) {
      window.clearTimeout(matchTimerRef.current);
      matchTimerRef.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    void loadUsablePhotoShapeRecords()
      .then((records) => {
        if (!cancelled) {
          setPhotoRecords(records);
          setDatasetReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDatasetReady(false);
        }
      });

    return () => {
      cancelled = true;
      clearPendingMatch();
    };
  }, []);

  const handleClear = () => {
    clearPendingMatch();
    setIsMatching(false);
    setPoints([]);
    setMatchedStroke([]);
    setResult(null);
    setViewMode("both");
  };

  const handleStrokeStart = () => {
    if (!isMatching && !hasResult) {
      return;
    }

    clearPendingMatch();
    setIsMatching(false);
    setMatchedStroke([]);
    setResult(null);
    setViewMode("both");
  };

  const handleSubmit = () => {
    if (!canSubmit || isMatching) {
      return;
    }

    const submittedPoints = [...points];
    clearPendingMatch();
    setMatchedStroke(submittedPoints);
    setResult(null);
    setIsMatching(true);

    matchTimerRef.current = window.setTimeout(() => {
      const nextResult = matchSnake(submittedPoints, photoRecords);
      setResult(nextResult);
      setViewMode("both");
      setIsMatching(false);
      matchTimerRef.current = null;
    }, MATCH_DELAY_MS);
  };

  return (
    <section className="px-5 pb-8 pt-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[94rem]">
        <div className="section-shell relative overflow-hidden rounded-[2.2rem] p-6 sm:p-7 xl:p-8">
          <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(94,124,71,0.14),transparent_72%)]" />

          <div className="relative flex flex-col gap-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-4xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                  One-page snake sketch matcher
                </p>
                <h1 className="serif-title mt-3 text-4xl font-semibold text-[var(--accent-strong)] sm:text-5xl xl:text-[4.6rem]">
                  Draw a line and reveal the closest snake in the same frame.
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base xl:text-[1.05rem]">
                  This client-side MVP compares a single drawn stroke against{" "}
                  {photoShapeManifest.usableImages.toLocaleString()} usable photo records drawn
                  from {photoShapeManifest.totalImages.toLocaleString()} local snake photos,
                  then returns the closest line-backed match and its linked species details.
                </p>
              </div>

              <CanvasControls
                canSubmit={canSubmit}
                isMatching={isMatching}
                onClear={handleClear}
                onSubmit={handleSubmit}
              />
            </div>

            {result ? (
              <div className="flex flex-wrap gap-2">
                {(["line", "silhouette", "photo", "both"] as OverlayViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                      viewMode === mode
                        ? "border-[var(--accent-strong)] bg-[var(--accent-strong)] text-stone-50"
                        : "border-[var(--line)] bg-white/72 text-[var(--muted)] hover:border-[var(--accent)] hover:bg-white"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.55fr)]">
              <div className="rounded-[1.8rem] border border-[var(--line)] bg-[#f8f1df]/92 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                <div className="relative overflow-hidden rounded-[1.55rem] border border-[rgba(49,72,44,0.14)] bg-[linear-gradient(135deg,rgba(240,231,210,0.96),rgba(246,240,225,0.86))]">
                  <DrawingCanvas
                    points={points}
                    onChange={setPoints}
                    onStrokeStart={handleStrokeStart}
                  />
                  {isMatching || result ? (
                    <FadeMatchView
                      points={matchedStroke}
                    result={result}
                    isMatching={isMatching}
                    canvasWidth={CANVAS_WIDTH}
                    canvasHeight={CANVAS_HEIGHT}
                    viewMode={viewMode}
                  />
                ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/64 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
                    How it works
                  </p>
                  <ol className="mt-3 space-y-3 text-sm leading-6 text-[var(--muted)]">
                    <li>1. Draw one uninterrupted line in the canvas.</li>
                    <li>2. Press match to compare it against extracted photo-line paths first.</li>
                    <li>3. Use the canvas toggle to compare your line, the matched silhouette, and the photo cutout.</li>
                  </ol>
                </div>

                <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/68 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
                    Match summary
                  </p>
                  {result ? (
                    <div className="mt-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="serif-title text-2xl font-semibold text-[var(--accent-strong)]">
                            {result.snake.commonName}
                          </p>
                          <p className="mt-1 text-sm italic text-[var(--muted)]">
                            {result.snake.scientificName}
                          </p>
                        </div>
                        <div className="rounded-[1rem] border border-[var(--line)] bg-white/78 px-3 py-2 text-right">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                            Similarity
                          </p>
                          <p className="mt-1 text-2xl font-extrabold text-[var(--accent-strong)]">
                            {result.score}%
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[var(--line)] bg-white/76 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                          {result.score < 58 ? "Approximate match" : `${result.confidenceLabel} confidence`}
                        </span>
                        <span className="rounded-full border border-[var(--line)] bg-white/76 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                          {result.snake.venomous === true
                            ? "Venomous"
                            : result.snake.venomous === false
                              ? "Non-venomous"
                              : "Venom status unknown"}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-sm leading-6 text-[var(--foreground)]">
                        {compactFacts.map((fact) => (
                          <p key={fact}>{fact}</p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                      Your latest match appears here with a compact confidence summary and a few quick facts.
                    </p>
                  )}
                </div>

                <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/60 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
                    Featured species
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {featuredSnakeProfiles.map((snake) => (
                      <span
                        key={snake.id}
                        className="rounded-full border border-[var(--line)] bg-white/74 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
                      >
                        {snake.commonName}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
