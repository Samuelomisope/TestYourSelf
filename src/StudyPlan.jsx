import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiGet, apiPatch } from "./api";
import { useAuth } from "./useAuth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faRobot,
  faCalendarDay,
  faClock,
  faCalendarCheck,
  faCircleCheck,
  faCircle,
  faPlus,
  faBookOpen,
  faChevronRight,
  faGraduationCap,
  faRotate,
  faLayerGroup,
  faFire,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";

/* ─────────────────────────────────────────────────────────────
   Small reusable UI components
───────────────────────────────────────────────────────────── */

function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={`bg-white/[0.06] rounded-2xl animate-pulse ${className}`}
    />
  );
}

function ProgressBar({ percent }) {
  const safePercent = Math.min(100, Math.max(0, percent));

  return (
    <div className="w-full h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-500"
        style={{ width: `${safePercent}%` }}
      />
    </div>
  );
}

function computeProgress(plan) {
  if (!plan) return 0;

  const entries = Array.isArray(plan.entries) ? plan.entries : [];

  const totalTasks = entries.reduce(
    (sum, entry) => sum + (entry.tasks?.length || 0),
    0
  );

  if (totalTasks === 0) return 0;

  const completed = plan.completedTasks || {};

  const completedCount = Object.values(completed).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
    0
  );

  return Math.min(100, Math.round((completedCount / totalTasks) * 100));
}

function getTaskStats(plan) {
  if (!plan) {
    return {
      total: 0,
      completed: 0,
      remaining: 0,
    };
  }

  const entries = Array.isArray(plan.entries) ? plan.entries : [];

  const total = entries.reduce(
    (sum, entry) => sum + (entry.tasks?.length || 0),
    0
  );

  const completed = Object.values(plan.completedTasks || {}).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
    0
  );

  return {
    total,
    completed: Math.min(completed, total),
    remaining: Math.max(total - completed, 0),
  };
}

function isTaskDone(plan, day, taskIndex) {
  const completed = plan?.completedTasks || {};
  const dayDone = completed[String(day)] || [];

  return dayDone.includes(taskIndex);
}

/* ─────────────────────────────────────────────────────────────
   Task row
───────────────────────────────────────────────────────────── */

function TaskRow({
  plan,
  day,
  task,
  taskIndex,
  onToggle,
  toggling,
}) {
  const done = isTaskDone(plan, day, taskIndex);

  return (
    <button
      type="button"
      onClick={() => onToggle(day, taskIndex)}
      disabled={toggling}
      className={`group w-full flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 ${
        done
          ? "bg-violet-500/[0.08] border-violet-500/20"
          : "bg-white/[0.025] border-white/[0.07] hover:bg-white/[0.045] hover:border-violet-500/20"
      } ${toggling ? "opacity-60 cursor-wait" : ""}`}
    >
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
          done
            ? "bg-violet-500/20 text-violet-400"
            : "bg-white/[0.04] text-ink/20 group-hover:text-violet-400 group-hover:bg-violet-500/10"
        }`}
      >
        <FontAwesomeIcon
          icon={done ? faCircleCheck : faCircle}
          className="text-sm"
        />
      </div>

      <span
        className={`text-sm flex-1 leading-relaxed ${
          done
            ? "text-ink/35 line-through"
            : "text-ink/75 group-hover:text-ink/90"
        }`}
      >
        {task}
      </span>

      {done && (
        <span className="text-[10px] uppercase tracking-wider font-semibold text-violet-400 shrink-0">
          Done
        </span>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Plan overview / hero
───────────────────────────────────────────────────────────── */

function PlanHero({ plan, progress, stats, todayEntry }) {
  const isComplete = progress >= 100;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-600/[0.16] via-violet-500/[0.06] to-white/[0.02] p-5 sm:p-7">
      {/* Decorative glow */}
      <div className="absolute -top-24 -right-20 w-64 h-64 rounded-full bg-violet-600/10 blur-[90px] pointer-events-none" />

      <div className="relative">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-400 text-xl shrink-0">
              <FontAwesomeIcon icon={faBookOpen} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-violet-400">
                  Your Study Plan
                </span>

                <span
                  className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full ${
                    isComplete
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-violet-500/10 text-violet-400"
                  }`}
                >
                  {isComplete ? "Completed" : "In Progress"}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
                {plan.subject}
              </h2>

              <p className="text-sm text-ink/40 mt-1">
                {plan.daysAvailable} day preparation plan
              </p>
            </div>
          </div>

          <div className="sm:text-right">
            <p className="text-3xl font-bold text-ink">{progress}%</p>
            <p className="text-xs text-ink/35 mt-0.5">overall progress</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-7">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-medium text-ink/45">
              Your progress
            </span>

            <span className="text-xs font-semibold text-ink/50">
              {stats.completed} of {stats.total} tasks
            </span>
          </div>

          <ProgressBar percent={progress} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
          <div className="rounded-2xl bg-black/[0.08] border border-white/[0.05] p-3.5">
            <div className="flex items-center gap-2 text-violet-400 mb-1.5">
              <FontAwesomeIcon icon={faCalendarDay} className="text-xs" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">
                Duration
              </span>
            </div>
            <p className="text-sm font-bold text-ink">
              {plan.daysAvailable} days
            </p>
          </div>

          <div className="rounded-2xl bg-black/[0.08] border border-white/[0.05] p-3.5">
            <div className="flex items-center gap-2 text-violet-400 mb-1.5">
              <FontAwesomeIcon icon={faClock} className="text-xs" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">
                Daily
              </span>
            </div>
            <p className="text-sm font-bold text-ink">
              {plan.hoursPerDay} hrs
            </p>
          </div>

          <div className="rounded-2xl bg-black/[0.08] border border-white/[0.05] p-3.5">
            <div className="flex items-center gap-2 text-violet-400 mb-1.5">
              <FontAwesomeIcon icon={faCheck} className="text-xs" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">
                Done
              </span>
            </div>
            <p className="text-sm font-bold text-ink">
              {stats.completed}
            </p>
          </div>

          <div className="rounded-2xl bg-black/[0.08] border border-white/[0.05] p-3.5">
            <div className="flex items-center gap-2 text-violet-400 mb-1.5">
              <FontAwesomeIcon icon={faCalendarCheck} className="text-xs" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">
                Exam
              </span>
            </div>
            <p className="text-sm font-bold text-ink">
              {plan.examDate
                ? new Date(plan.examDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : "Not set"}
            </p>
          </div>
        </div>

        {/* Today's quick status */}
        {todayEntry && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-violet-500/[0.07] border border-violet-500/10 px-4 py-3">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 shrink-0">
              <FontAwesomeIcon icon={faFire} className="text-xs" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-violet-400">
                Today's focus
              </p>
              <p className="text-sm text-ink/70 truncate mt-0.5">
                {todayEntry.focus}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Today's tasks
───────────────────────────────────────────────────────────── */

function TodaySection({
  plan,
  todayEntry,
  dayNumber,
  onToggle,
  togglingKey,
}) {
  if (!todayEntry) {
    return (
      <section>
        <SectionHeading
          eyebrow="Your journey"
          title="Plan complete"
          icon={faGraduationCap}
        />

        <div className="rounded-3xl border border-emerald-500/15 bg-emerald-500/[0.04] p-6 sm:p-7 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xl">
            <FontAwesomeIcon icon={faCircleCheck} />
          </div>

          <h3 className="text-lg font-bold text-ink mt-4">
            You made it to the end!
          </h3>

          <p className="text-sm text-ink/40 max-w-md mx-auto mt-2 leading-relaxed">
            You've reached the final day of this study plan. Great work.
            Create a new plan when you're ready for your next goal.
          </p>

          <Link
            to="/ai"
            className="inline-flex items-center gap-2 mt-5 bg-violet-500 hover:bg-violet-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
          >
            <FontAwesomeIcon icon={faRobot} />
            Create New Plan
          </Link>
        </div>
      </section>
    );
  }

  const tasks = todayEntry.tasks || [];
  const completedToday = tasks.filter((_, index) =>
    isTaskDone(plan, dayNumber, index)
  ).length;

  return (
    <section>
      <SectionHeading
        eyebrow={`Day ${dayNumber} of ${plan.daysAvailable}`}
        title="Today's Focus"
        icon={faFire}
        rightContent={
          <span className="text-xs font-semibold text-ink/40">
            {completedToday}/{tasks.length} complete
          </span>
        }
      />

      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 shrink-0">
            <FontAwesomeIcon icon={faGraduationCap} />
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-violet-400 mb-1">
              Focus area
            </p>

            <h3 className="text-lg font-bold text-ink leading-snug">
              {todayEntry.focus}
            </h3>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {tasks.length > 0 ? (
            tasks.map((task, index) => (
              <TaskRow
                key={index}
                plan={plan}
                day={dayNumber}
                task={task}
                taskIndex={index}
                onToggle={onToggle}
                toggling={togglingKey === `${dayNumber}-${index}`}
              />
            ))
          ) : (
            <p className="text-sm text-ink/35">
              No specific tasks were added for today.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section heading
───────────────────────────────────────────────────────────── */

function SectionHeading({
  eyebrow,
  title,
  icon,
  rightContent,
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3.5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
          <FontAwesomeIcon icon={icon} className="text-xs" />
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-ink/30">
            {eyebrow}
          </p>
          <h3 className="text-base font-bold text-ink mt-0.5">
            {title}
          </h3>
        </div>
      </div>

      {rightContent}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Full plan timeline
───────────────────────────────────────────────────────────── */

function FullPlanTimeline({
  plan,
  dayNumber,
}) {
  const entries = Array.isArray(plan.entries) ? plan.entries : [];

  return (
    <section>
      <SectionHeading
        eyebrow="Your roadmap"
        title="Full Study Plan"
        icon={faLayerGroup}
      />

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[15px] top-5 bottom-5 w-px bg-white/[0.07]" />

        <div className="flex flex-col gap-3">
          {entries.map((entry) => {
            const isToday = entry.day === dayNumber;
            const tasks = entry.tasks || [];

            const completedCount = tasks.filter((_, index) =>
              isTaskDone(plan, entry.day, index)
            ).length;

            const dayComplete =
              tasks.length > 0 && completedCount === tasks.length;

            return (
              <div
                key={entry.day}
                className="relative pl-10"
              >
                {/* Timeline dot */}
                <div
                  className={`absolute left-0 top-5 w-8 h-8 rounded-full border flex items-center justify-center z-10 ${
                    isToday
                      ? "bg-violet-500 border-violet-400 text-white shadow-lg shadow-violet-500/20"
                      : dayComplete
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-bg border-white/[0.08] text-ink/30"
                  }`}
                >
                  {dayComplete ? (
                    <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                  ) : (
                    <span className="text-[10px] font-bold">
                      {entry.day}
                    </span>
                  )}
                </div>

                <div
                  className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                    isToday
                      ? "bg-violet-500/[0.06] border-violet-500/25"
                      : "bg-white/[0.02] border-white/[0.07]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-ink">
                          Day {entry.day}
                        </span>

                        {isToday && (
                          <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-violet-500/15 text-violet-400">
                            Today
                          </span>
                        )}

                        {dayComplete && !isToday && (
                          <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                            Complete
                          </span>
                        )}
                      </div>

                      <p className="text-sm sm:text-base font-semibold text-ink/80 mt-2 leading-relaxed">
                        {entry.focus}
                      </p>
                    </div>

                    {tasks.length > 0 && (
                      <span className="text-[10px] font-medium text-ink/30 whitespace-nowrap">
                        {completedCount}/{tasks.length}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    {tasks.map((task, index) => {
                      const done = isTaskDone(plan, entry.day, index);

                      return (
                        <div
                          key={index}
                          className={`flex items-start gap-2.5 text-sm leading-relaxed ${
                            done
                              ? "text-ink/25 line-through"
                              : "text-ink/45"
                          }`}
                        >
                          <span
                            className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${
                              done
                                ? "bg-emerald-400/40"
                                : "bg-violet-400"
                            }`}
                          />
                          <span>{task}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Current plan view
───────────────────────────────────────────────────────────── */

function CurrentPlanView({
  plan,
  todayEntry,
  dayNumber,
  onToggle,
  togglingKey,
}) {
  const progress = computeProgress(plan);
  const stats = getTaskStats(plan);

  return (
    <div className="flex flex-col gap-8">
      <PlanHero
        plan={plan}
        progress={progress}
        stats={stats}
        todayEntry={todayEntry}
      />

      <TodaySection
        plan={plan}
        todayEntry={todayEntry}
        dayNumber={dayNumber}
        onToggle={onToggle}
        togglingKey={togglingKey}
      />

      <FullPlanTimeline
        plan={plan}
        dayNumber={dayNumber}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Past plans
───────────────────────────────────────────────────────────── */

function PastPlansView({
  plans,
  currentPlanId,
}) {
  if (plans.length === 0) {
    return (
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-10 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400">
          <FontAwesomeIcon icon={faLayerGroup} />
        </div>

        <p className="text-sm font-semibold text-ink mt-4">
          No past plans yet
        </p>

        <p className="text-xs text-ink/35 mt-1 max-w-xs mx-auto">
          Your previous study plans will appear here when you create new ones.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {plans.map((plan) => {
        const isCurrent = plan.id === currentPlanId;
        const progress = computeProgress(plan);
        const stats = getTaskStats(plan);

        return (
          <div
            key={plan.id}
            className={`group rounded-2xl border p-4 sm:p-5 transition-all ${
              isCurrent
                ? "border-violet-500/25 bg-violet-500/[0.05]"
                : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.035]"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 shrink-0">
                  <FontAwesomeIcon icon={faBookOpen} className="text-sm" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-ink text-sm truncate">
                      {plan.subject}
                    </p>

                    {isCurrent && (
                      <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-violet-500/15 text-violet-400">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-ink/35">
                    <span>
                      <FontAwesomeIcon
                        icon={faCalendarDay}
                        className="mr-1.5"
                      />
                      {plan.daysAvailable} days
                    </span>

                    <span>
                      <FontAwesomeIcon
                        icon={faClock}
                        className="mr-1.5"
                      />
                      {plan.hoursPerDay} hrs/day
                    </span>

                    <span>
                      {new Date(plan.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <FontAwesomeIcon
                icon={faChevronRight}
                className="text-xs text-ink/15 group-hover:text-violet-400 transition shrink-0 mt-2"
              />
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-ink/30">
                  Progress
                </span>

                <span className="text-xs text-ink/40">
                  {stats.completed}/{stats.total} tasks · {progress}%
                </span>
              </div>

              <ProgressBar percent={progress} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */

function StudyPlan() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("current");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [current, setCurrent] = useState(null);

  const [pastPlans, setPastPlans] = useState([]);
  const [pastLoading, setPastLoading] = useState(false);

  const [togglingKey, setTogglingKey] = useState(null);

  const loadCurrent = useCallback(() => {
    setLoading(true);
    setError(null);

    apiGet("/ai/study-plan/current")
      .then(setCurrent)
      .catch(() => setError("Couldn't load your study plan."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCurrent();
  }, [loadCurrent]);

  useEffect(() => {
    if (tab !== "past" || pastPlans.length > 0) return;

    setPastLoading(true);

    apiGet("/ai/study-plan")
      .then(setPastPlans)
      .catch(() => setPastPlans([]))
      .finally(() => setPastLoading(false));
  }, [tab, pastPlans.length]);

  const handleToggle = async (day, taskIndex) => {
    if (!current?.plan) return;

    const key = `${day}-${taskIndex}`;

    setTogglingKey(key);

    // Optimistic update
    setCurrent((prev) => {
      if (!prev?.plan) return prev;

      const completed = {
        ...(prev.plan.completedTasks || {}),
      };

      const dayKey = String(day);

      const dayDone = new Set(completed[dayKey] || []);

      if (dayDone.has(taskIndex)) {
        dayDone.delete(taskIndex);
      } else {
        dayDone.add(taskIndex);
      }

      completed[dayKey] = Array.from(dayDone);

      return {
        ...prev,
        plan: {
          ...prev.plan,
          completedTasks: completed,
        },
      };
    });

    try {
      await apiPatch(
        `/ai/study-plan/${current.plan.id}/task`,
        {
          day,
          taskIndex,
        }
      );
    } catch {
      loadCurrent();
    } finally {
      setTogglingKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-32 w-[30rem] h-[30rem] bg-violet-600 rounded-full opacity-[0.07] blur-[130px]" />

        <div className="absolute top-[40%] -right-40 w-[28rem] h-[28rem] bg-violet-500 rounded-full opacity-[0.04] blur-[130px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-40 bg-bg/85 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-ink/40 hover:text-violet-400 hover:border-violet-500/20 transition shrink-0"
                aria-label="Go back"
              >
                <FontAwesomeIcon
                  icon={faArrowLeft}
                  className="text-sm"
                />
              </button>

              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-ink truncate">
                  Study Plan
                </h1>

                <p className="hidden sm:block text-[10px] text-ink/30 uppercase tracking-wider mt-0.5">
                  Your roadmap to consistent learning
                </p>
              </div>
            </div>

            <Link
              to="/ai"
              className="flex items-center gap-2 bg-violet-500 hover:bg-violet-400 text-white text-xs sm:text-sm font-semibold px-3.5 sm:px-4 py-2.5 rounded-xl transition shadow-lg shadow-violet-500/10"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" />
              <span className="hidden xs:inline">Create Plan</span>
              <span className="sm:hidden">Create</span>
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1.5 pb-3">
            {[
              {
                id: "current",
                label: "My Plan",
              },
              {
                id: "past",
                label: "Past Plans",
              },
            ].map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                  tab === t.id
                    ? "bg-violet-500 text-white shadow-md shadow-violet-500/10"
                    : "bg-white/[0.03] text-ink/35 hover:text-ink/70 hover:bg-white/[0.05]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 pt-32 sm:pt-36 px-4 sm:px-6 pb-20 max-w-4xl mx-auto">
        {tab === "current" && (
          <>
            {/* Loading */}
            {loading && (
              <div className="flex flex-col gap-6">
                <SkeletonBlock className="h-[310px]" />
                <SkeletonBlock className="h-[280px]" />
                <SkeletonBlock className="h-[400px]" />
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="rounded-3xl border border-red-500/10 bg-red-500/[0.03] p-10 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400">
                  <FontAwesomeIcon icon={faRotate} />
                </div>

                <p className="text-sm font-semibold text-ink mt-4">
                  Something went wrong
                </p>

                <p className="text-xs text-ink/35 mt-1">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={loadCurrent}
                  className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-semibold transition"
                >
                  <FontAwesomeIcon icon={faRotate} className="text-xs" />
                  Try Again
                </button>
              </div>
            )}

            {/* Empty */}
            {!loading &&
              !error &&
              (!current || !current.plan) && (
                <div className="rounded-3xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.07] to-white/[0.02] p-8 sm:p-12 text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-500/10 border border-violet-500/10 flex items-center justify-center text-violet-400 text-2xl">
                    <FontAwesomeIcon icon={faCalendarCheck} />
                  </div>

                  <p className="text-xl font-bold text-ink mt-5">
                    No Study Plan Yet
                  </p>

                  <p className="text-sm text-ink/40 max-w-sm mx-auto mt-2 leading-relaxed">
                    Let AI create a personalized study roadmap based on your
                    subject, available time, and exam goal.
                  </p>

                  <Link
                    to="/ai"
                    className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-400 text-white text-sm font-semibold px-5 py-3 rounded-xl transition mt-6 shadow-lg shadow-violet-500/10"
                  >
                    <FontAwesomeIcon icon={faRobot} />
                    Create with AI
                  </Link>
                </div>
              )}

            {/* Current plan */}
            {!loading &&
              !error &&
              current?.plan && (
                <CurrentPlanView
                  plan={current.plan}
                  todayEntry={current.todayEntry}
                  dayNumber={current.dayNumber}
                  onToggle={handleToggle}
                  togglingKey={togglingKey}
                />
              )}
          </>
        )}

        {/* Past Plans */}
        {tab === "past" && (
          <section>
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-violet-400">
                Your history
              </p>

              <h2 className="text-2xl font-bold text-ink mt-1">
                Past Study Plans
              </h2>

              <p className="text-sm text-ink/35 mt-1">
                Keep track of the plans you've created over time.
              </p>
            </div>

            {pastLoading ? (
              <div className="flex flex-col gap-3">
                <SkeletonBlock className="h-32" />
                <SkeletonBlock className="h-32" />
                <SkeletonBlock className="h-32" />
              </div>
            ) : (
              <PastPlansView
                plans={pastPlans}
                currentPlanId={current?.plan?.id}
              />
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default StudyPlan;