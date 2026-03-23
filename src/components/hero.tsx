export function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-5 pb-8 pt-6 sm:px-8 lg:px-10">
      <div className="absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(circle_at_top,rgba(255,249,237,0.96),transparent_68%)]" />
      <div className="texture-ring left-[-10rem] top-[4rem] h-[24rem] w-[24rem]" />
      <div className="texture-ring right-[-8rem] top-[1.5rem] h-[18rem] w-[18rem]" />
      <div className="mx-auto flex min-h-[min(58rem,calc(100svh-2rem))] w-full max-w-[94rem] flex-col justify-between rounded-[2rem] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(28,41,26,0.95),rgba(52,70,44,0.88)_42%,rgba(211,139,77,0.48))] px-6 py-6 text-stone-100 shadow-[0_36px_90px_rgba(29,38,24,0.24)] sm:px-8 lg:px-12">
        <div className="flex items-center justify-between gap-4 text-sm tracking-[0.24em] text-stone-200/84 uppercase">
          <span>Snake Match</span>
          <span>Desktop-first sketch matcher</span>
        </div>

        <div className="grid gap-10 pb-6 pt-10 xl:grid-cols-[minmax(0,1.2fr)_minmax(25rem,30rem)] xl:items-end">
          <div className="max-w-4xl">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.28em] text-emerald-100/70">
              Shape-first wildlife playground
            </p>
            <h1 className="serif-title max-w-5xl text-5xl leading-[0.9] font-semibold text-stone-50 sm:text-6xl xl:text-[5.8rem]">
              Draw a single line, then watch the closest snake emerge in full scale.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-7 text-stone-200/84 sm:text-lg xl:text-[1.12rem]">
              Snake Match turns your sketch into a normalized path, compares it against
              a curated species profile set, and returns a best-fit photo with a plain
              language confidence report.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-white/12 bg-white/8 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-200/70">
                  Input
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-100/86">
                  One uninterrupted line. Long curves, loops, and tight turns all matter.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-white/12 bg-white/8 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-200/70">
                  Match logic
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-100/86">
                  Path length, body ratio, curvature, turn rhythm, and waviness.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-white/12 bg-white/8 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-200/70">
                  Output
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-100/86">
                  Matched species photo, confidence report, and educational notes.
                </p>
              </div>
            </div>
          </div>

          <div className="section-shell rounded-[1.75rem] border-white/10 bg-white/10 p-6 text-sm text-stone-100/84">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/76">
              Desktop flow
            </p>
            <ol className="mt-4 space-y-4 leading-6">
              <li>1. Draw one continuous snake-like stroke on the canvas below.</li>
              <li>2. Submit it for a geometric comparison against the local species set.</li>
              <li>3. Review the closest match, similarity score, and species notes.</li>
            </ol>
            <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-[rgba(12,20,12,0.16)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/76">
                Recommended setup
              </p>
              <p className="mt-2 leading-6 text-stone-100/84">
                This version is tuned for desktop screens first, with a larger canvas and a
                side-by-side result view. Mobile remains usable, but the main composition is
                intentionally optimized for laptop and monitor widths.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
