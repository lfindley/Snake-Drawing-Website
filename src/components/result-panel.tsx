import Image from "next/image";

import type { MatchResult } from "@/lib/types";

type ResultPanelProps = {
  result: MatchResult | null;
};

function venomText(value: boolean | null) {
  if (value === true) {
    return "Venomous";
  }

  if (value === false) {
    return "Non-venomous";
  }

  return "Unknown";
}

export function ResultPanel({ result }: ResultPanelProps) {
  if (!result) {
    return (
      <div className="section-shell rounded-[1.8rem] p-6 xl:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
          Result
        </p>
        <h3 className="serif-title mt-3 text-3xl font-semibold text-[var(--accent-strong)] xl:text-4xl">
          Waiting for your drawing
        </h3>
        <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--muted)]">
          The matcher will analyze your stroke length, ratio, curvature, turning rhythm,
          and waviness before selecting a closest snake profile.
        </p>
      </div>
    );
  }

  const isLowConfidence = result.score < 58;

  return (
    <div className="section-shell rounded-[1.8rem] p-5 sm:p-6 xl:p-7">
      <div className="grid gap-6 xl:grid-cols-[minmax(19rem,23rem)_minmax(0,1fr)]">
        <div className="relative min-h-[22rem] overflow-hidden rounded-[1.5rem] border border-[rgba(49,72,44,0.14)] xl:min-h-[28rem]">
          <Image
            src={result.snake.image}
            alt={result.snake.commonName}
            fill
            className="object-cover"
            sizes="(max-width: 1280px) 100vw, 30rem"
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
                Best match
              </p>
              <h3 className="serif-title mt-2 text-3xl font-semibold text-[var(--accent-strong)] xl:text-[2.8rem]">
                {result.snake.commonName}
              </h3>
              <p className="mt-1 text-sm italic text-[var(--muted)]">
                {result.snake.scientificName}
              </p>
            </div>

            <div className="rounded-[1.2rem] border border-[var(--line)] bg-white/78 px-4 py-3 text-right xl:min-w-[12rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Similarity
              </p>
              <p className="mt-1 text-3xl font-extrabold text-[var(--accent-strong)] xl:text-4xl">
                {result.score}%
              </p>
              <p className="text-sm text-[var(--muted)]">
                {isLowConfidence ? "Approximate match" : `${result.confidenceLabel} confidence`}
              </p>
            </div>
          </div>

          {isLowConfidence ? (
            <div className="mt-5 rounded-[1.35rem] border border-[rgba(211,139,77,0.32)] bg-[rgba(255,248,239,0.72)] px-4 py-4 text-sm leading-7 text-[var(--foreground)]">
              This stroke produced a weaker match signal. Use the result as an approximate
              resemblance only, especially if your drawing has very tight loops or very short
              segments.
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-full border border-[var(--line)] bg-white/74 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              {venomText(result.snake.venomous)}
            </span>
            <span className="rounded-full border border-[var(--line)] bg-white/74 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Habitat: {result.snake.habitat ?? "Unknown"}
            </span>
            <span className="rounded-full border border-[var(--line)] bg-white/74 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Region: {result.snake.region ?? "Unknown"}
            </span>
          </div>

          <div className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)]">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
                Quick facts
              </p>
              <ul className="mt-3 space-y-3 text-sm leading-7 text-[var(--foreground)]">
                {result.snake.facts.slice(0, 5).map((fact) => (
                  <li key={fact} className="flex gap-3">
                    <span className="mt-[0.7rem] h-1.5 w-1.5 rounded-full bg-[var(--highlight)]" />
                    <span className="min-w-0 break-words">{fact}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0 2xl:pl-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
                Confidence report
              </p>
              <div className="mt-3 space-y-3">
                {result.featureBreakdown.map((feature) => (
                  <div
                    key={feature.key}
                    className="rounded-[1.2rem] border border-[var(--line)] bg-white/68 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[var(--accent-strong)]">
                        {feature.label}
                      </span>
                      <span className="text-sm text-[var(--muted)]">
                        {Math.round(feature.similarity * 100)}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgba(49,72,44,0.1)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--highlight))]"
                        style={{ width: `${Math.max(feature.similarity * 100, 6)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
