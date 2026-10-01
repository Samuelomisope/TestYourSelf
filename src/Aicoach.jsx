// Replace the existing AICoach function in StudyPlan.jsx with this one.
// (CoachPill, faWandMagicSparkles, useEffect/useState and apiGet are already imported there.)
//
// Then change its usage in the page to:
//   <AICoach
//     plan={plan}
//     progress={progress}
//     stats={stats}
//     busy={togglingKey !== null}
//   />

function localCoachMessage(progress, remaining) {
  if (progress >= 100) {
    return "Your plan is complete. You can create a new roadmap for your next academic goal.";
  }
  if (progress >= 70) {
    return "You're well into the roadmap. Keep your remaining sessions focused and consistent.";
  }
  if (remaining > 0) {
    return "Stay focused on today's tasks first. Completing small sessions consistently builds momentum.";
  }
  return "Your plan is ready. Start with today's focus to build momentum.";
}

function AICoach({ plan, progress, stats, busy = false }) {
  const [coach, setCoach] = useState({ message: null, source: null, loading: true });

  // Re-ask the coach only when the student's state actually changes.
  const signature = `${plan.id}:${stats.completed}`;

  useEffect(() => {
    // Wait until any in-flight task save finishes, so the server sees the latest state.
    if (busy) return;

    let cancelled = false;

    // Debounce: ticking several tasks in a row produces one request, not many.
    const timer = setTimeout(() => {
      setCoach((prev) => ({ ...prev, loading: true }));

      apiGet(`/ai/study-plan/${plan.id}/coach`)
        .then((res) => {
          if (cancelled) return;
          setCoach({
            message: res?.message || null,
            source: res?.source || null,
            loading: false,
          });
        })
        .catch(() => {
          if (cancelled) return;
          setCoach({ message: null, source: "local", loading: false });
        });
    }, 1200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [signature, busy, plan.id]);

  const message = coach.message || localCoachMessage(progress, stats.remaining);
  const isAI = coach.source === "ai";
  const showSkeleton = coach.loading && !coach.message;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.08] to-white/[0.02] p-5 sm:p-6">
      <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
      <div className="relative flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl bg-violet-500/15 border border-violet-500/15 text-violet-300 flex items-center justify-center shrink-0">
          <FontAwesomeIcon icon={faWandMagicSparkles} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-violet-300">
              {isAI ? "AI Study Coach" : "Study Coach"}
            </p>
            {plan.subject && (
              <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-[8px] font-bold uppercase tracking-wider text-violet-400">
                {plan.subject}
              </span>
            )}
          </div>

          {showSkeleton ? (
            <div className="mt-3 space-y-2" aria-hidden="true">
              <div className="h-3 rounded bg-white/[0.06] animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-white/[0.06] animate-pulse" />
            </div>
          ) : (
            <p
              aria-live="polite"
              className={`text-sm text-ink/65 leading-relaxed mt-2 transition-opacity ${
                coach.loading ? "opacity-50" : "opacity-100"
              }`}
            >
              {message}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            <CoachPill label={`${progress}% complete`} />
            <CoachPill label={`${stats.remaining} tasks left`} />
            <CoachPill label={`${stats.completed} completed`} />
          </div>
        </div>
      </div>
    </section>
  );
}