const scrollToTurn = (turnId) => {
  const target = document.getElementById(`turn-${turnId}`);
  if (!target) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
};

const button = "rounded-lg border border-ink/10 px-2.5 py-1 font-semibold transition hover:bg-ink/5 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-violet-500";

/**
 * Moves between the board pages of the lesson, one per step the tutor has taught. The parent owns which page is
 * showing (the whiteboard follows it too); choosing a page also jumps the lesson to the reply that introduced it.
 */
export default function PageNav({ pages, index, onChange }) {
  if (pages.length < 2) return null;
  const page = pages[index];
  const go = (next) => { onChange(next); scrollToTurn(pages[next].turnId); };

  return (
    <nav aria-label="Lesson steps" className="flex items-center gap-2 rounded-xl bg-violet-500/10 px-3 py-2 text-xs text-violet-900 dark:text-violet-100">
      <button type="button" className={button} onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous step">←</button>
      <p className="min-w-0 flex-1 truncate text-center font-medium" aria-live="polite">
        Step {index + 1} of {pages.length}{page.title ? `: ${page.title}` : ""}
      </p>
      <button type="button" className={button} onClick={() => go(index + 1)} disabled={index === pages.length - 1} aria-label="Next step">→</button>
    </nav>
  );
}
