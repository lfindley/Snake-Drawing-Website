export function Disclaimer() {
  return (
    <section className="px-5 pb-10 pt-4 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl rounded-[1.8rem] border border-[var(--line)] bg-white/56 px-6 py-5 text-sm leading-7 text-[var(--muted)] shadow-[0_18px_60px_rgba(39,53,33,0.08)]">
        Snake Match is an educational approximation. This MVP compares a single drawn line
        against simplified geometric species profiles and a curated photo set. It does not
        identify real snakes in the field and should never be used for safety decisions.
      </div>
    </section>
  );
}
