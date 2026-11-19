import { Check, Circle, CircleDot } from "lucide-react";
import { WEAK_CUTOFF, percentOf, timeAgo, weakSteps } from "./progressView";

/**
 * The lesson plan with progress. Progress is decided by the server (currentStepIndex), so this only displays it:
 * steps before the current one are done, the current one is in progress, the rest are up next.
 */
export default function OutlinePanel({ objectives, outline, current, started, checks = [], onCheck }) {
  const total = outline.length;
  const byStep = new Map(checks.map((c) => [c.stepIndex, c]));
  const weak = weakSteps(checks).filter((c) => c.stepIndex < total);
  const taught = started ? current + 1 : 0;
  const percent = Math.round((taught / total) * 100);

  return (
    <section className="rounded-2xl border border-ink/10 bg-bg-elevated p-5 shadow-sm">
      <h2 className="font-bold">Lesson plan</h2>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-ink/55">
          <span>{started ? `Step ${taught} of ${total}` : `${total} steps`}</span>
          <span>{percent}%</span>
        </div>
        <div role="progressbar" aria-label="Lesson progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={taught} className="mt-1 h-2 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full rounded-full bg-violet-600 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {objectives.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink/45">You will learn to</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/75">{objectives.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}

      {weak.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200">Worth another look</h3>
          <p className="mt-1 text-xs text-ink/60">Steps where your best check-in score is under {WEAK_CUTOFF}%.</p>
          <ul className="mt-2 space-y-1.5">
            {weak.map((c) => (
              <li key={c.stepIndex} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{c.stepIndex + 1}. {outline[c.stepIndex]?.title ?? c.stepTitle}: {percentOf(c.best)}%</span>
                {onCheck && <button type="button" onClick={() => onCheck(c.stepIndex)} className="min-h-9 shrink-0 rounded-lg border border-amber-600/40 px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-violet-500">Check again</button>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ol className="mt-4 space-y-1">
        {outline.map((step, index) => {
          const done = started && index < current;
          const active = index === current;
          const Icon = done ? Check : active ? CircleDot : Circle;
          return (
            <li key={step.id} aria-current={active ? "step" : undefined} className={`flex gap-3 rounded-xl p-2.5 ${active ? "bg-violet-500/10" : ""}`}>
              <Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${done ? "text-emerald-600 dark:text-emerald-400" : active ? "text-violet-600 dark:text-violet-400" : "text-ink/30"}`} />
              <div className="min-w-0">
                <p className={`text-sm ${active ? "font-semibold text-ink" : done ? "text-ink/60" : "text-ink/70"}`}>
                  <span className="sr-only">{done ? "Completed: " : active ? (started ? "Current step: " : "Next step: ") : "Up next: "}</span>
                  {step.title}
                </p>
                {active && step.summary && <p className="mt-0.5 text-xs text-ink/55">{step.summary}</p>}
                {byStep.has(index) && (() => {
                  const c = byStep.get(index);
                  return <p className="mt-0.5 text-xs text-ink/55">Best {percentOf(c.best) ?? "–"}% · latest {percentOf(c.latest) ?? "–"}% · {c.attempts} {c.attempts === 1 ? "attempt" : "attempts"}, last {timeAgo(c.latest.createdAt)}</p>;
                })()}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
