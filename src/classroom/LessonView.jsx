import Md from "./Markdown";

// Each label says where a step came from, in words, so it never depends on colour alone.
const ORIGIN = {
  SOURCE: { label: "From your notes", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  SIMPLIFIED: { label: "Simplified from your notes", cls: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  EXTRA: { label: "Beyond your notes", cls: "bg-amber-500/10 text-amber-800 dark:text-amber-300" },
};

const titles = (sources) => [...new Set((sources || []).map((source) => source.title).filter(Boolean))];

/**
 * Renders one tutor reply. Works for both stored formats: version 1 turns have no origin or per-step sources,
 * version 2 turns do. Origin labels only appear for lessons that were meant to use documents.
 */
export default function LessonView({ lesson, label, showOrigins }) {
  if (!lesson) return null;
  const steps = Array.isArray(lesson.steps) ? lesson.steps : [];
  const examples = Array.isArray(lesson.examples) ? lesson.examples : [];
  const sourceTitles = titles(lesson.sources);

  return (
    <div className="mt-3 space-y-4">
      {label && <p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">{label}</p>}
      <Md>{lesson.summary}</Md>

      {steps.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Step by step</h3>
          {steps.map((step) => {
            const origin = showOrigins ? ORIGIN[step.origin] : null;
            const from = showOrigins ? titles(step.sources) : [];
            return (
              <section key={step.id} className="rounded-xl bg-ink/[0.035] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold text-ink">{step.title}</h4>
                  {origin && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${origin.cls}`}>{origin.label}</span>}
                </div>
                <Md className="mt-1">{step.explanation}</Md>
                {from.length > 0 && <p className="mt-2 text-xs text-ink/50">From: {from.join(", ")}</p>}
              </section>
            );
          })}
        </div>
      )}

      {examples.map((example, index) => (
        <section key={`${example.title}-${index}`} className="rounded-xl border border-violet-500/15 bg-violet-500/[0.04] p-4">
          <h3 className="font-semibold text-violet-700 dark:text-violet-300">{example.title}</h3>
          <Md className="mt-1">{example.prompt}</Md>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink/70">
            {(example.solutionSteps || []).map((step, i) => <li key={i}><Md className="[&_p]:my-0">{step}</Md></li>)}
          </ol>
        </section>
      ))}

      {sourceTitles.length > 0 && <p className="text-xs text-ink/50">Sources: {sourceTitles.join(", ")}</p>}

      {lesson.followUpQuestion && (
        <div className="rounded-xl bg-amber-500/10 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">Check your understanding</p>
          <Md className="mt-1">{lesson.followUpQuestion}</Md>
        </div>
      )}
    </div>
  );
}
