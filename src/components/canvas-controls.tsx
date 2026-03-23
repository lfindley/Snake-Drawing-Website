type CanvasControlsProps = {
  canSubmit: boolean;
  isMatching: boolean;
  onClear: () => void;
  onSubmit: () => void;
};

export function CanvasControls({
  canSubmit,
  isMatching,
  onClear,
  onSubmit,
}: CanvasControlsProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-white/70 px-5 py-3 text-sm font-semibold text-[var(--accent-strong)] transition hover:border-[var(--accent)] hover:bg-white"
      >
        Clear Canvas
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || isMatching}
        className="inline-flex items-center justify-center rounded-full bg-[var(--accent-strong)] px-5 py-3 text-sm font-semibold text-stone-50 transition hover:bg-[#21341d] disabled:cursor-not-allowed disabled:bg-[#7b856f]"
      >
        {isMatching ? "Matching..." : "Match My Snake"}
      </button>
    </div>
  );
}
