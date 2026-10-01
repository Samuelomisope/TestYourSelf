import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet, apiPatch } from "./api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faBolt,
  faBookOpen,
  faBrain,
  faBullseye,
  faCalendarCheck,
  faCalendarDay,
  faCheck,
  faChevronDown,
  faCircleCheck,
  faCircle,
  faClock,
  faGraduationCap,
  faLayerGroup,
  faLock,
  faPlus,
  faRotate,
  faRobot,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";

/* ============================================================
   Helpers
============================================================ */

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function getEntries(plan) {
  return Array.isArray(plan?.entries) ? plan.entries : [];
}

function isTaskDone(plan, day, taskIndex) {
  return (plan?.completedTasks?.[String(day)] || []).includes(taskIndex);
}

function getTaskStats(plan) {
  const entries = getEntries(plan);
  const total = entries.reduce((sum, entry) => sum + (entry.tasks?.length || 0), 0);
  const completed = Math.min(
    total,
    Object.values(plan?.completedTasks || {}).reduce(
      (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
      0
    )
  );

  return { total, completed, remaining: Math.max(total - completed, 0) };
}

function computeProgress(plan) {
  const stats = getTaskStats(plan);
  return stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
}

function formatDate(date) {
  if (!date) return "Not set";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(date) {
  if (!date) return null;
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return null;
  target.setHours(23, 59, 59, 999);
  const now = new Date();
  return Math.max(0, Math.ceil((target - now) / 86400000));
}

function getDayLabel(entry, index) {
  if (entry?.date) {
    const d = new Date(entry.date);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { weekday: "short" });
    }
  }
  return `D${entry?.day ?? index + 1}`;
}

function getDayStatus(plan, entry) {
  const tasks = entry?.tasks || [];
  const completed = tasks.filter((_, i) =>
    isTaskDone(plan, entry.day, i)
  ).length;

  return {
    completed,
    total: tasks.length,
    complete: tasks.length > 0 && completed === tasks.length,
  };
}

/** Today and earlier days can be ticked; future days are locked. */
function isDayUnlocked(day, currentDay) {
  return currentDay == null || day <= currentDay;
}

/** Pure toggle of one task, used for both the optimistic update and its rollback. */
function applyToggle(prev, day, taskIndex) {
  if (!prev?.plan) return prev;

  const completed = { ...(prev.plan.completedTasks || {}) };
  const dayKey = String(day);
  const dayDone = new Set(completed[dayKey] || []);

  if (dayDone.has(taskIndex)) dayDone.delete(taskIndex);
  else dayDone.add(taskIndex);

  completed[dayKey] = Array.from(dayDone);

  return { ...prev, plan: { ...prev.plan, completedTasks: completed } };
}

/* ============================================================
   Small UI primitives
============================================================ */

function ProgressBar({ percent, className = "" }) {
  const value = clamp(percent);

  return (
    <div className={`h-2 rounded-full bg-white/[0.06] overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet-600 via-violet-500 to-fuchsia-400 transition-all duration-700"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function ProgressRing({ percent, size = 112 }) {
  const value = clamp(percent);
  const radius = 43;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${value}% complete`}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-white/[0.06]"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-violet-500 transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-ink">{value}%</span>
        <span className="text-[9px] uppercase tracking-wider text-ink/30">
          complete
        </span>
      </div>
    </div>
  );
}

function Skeleton({ className = "" }) {
  return (
    <div className={`rounded-3xl bg-white/[0.05] animate-pulse ${className}`} />
  );
}

function SectionTitle({ eyebrow, title, icon, action }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
          <FontAwesomeIcon icon={icon} className="text-xs" />
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-violet-400">
            {eyebrow}
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-ink tracking-tight">
            {title}
          </h2>
        </div>
      </div>
      {action}
    </div>
  );
}

/**
 * A compact, tickable task line used in the selected-day preview and the
 * full roadmap. Locked when the day hasn't started yet.
 */
function TaskRow({ task, done, locked, toggling, onToggle, small = false }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={locked || toggling}
      aria-pressed={done}
      title={locked ? "Unlocks when this day starts" : undefined}
      className={`w-full flex items-start gap-3 text-left rounded-xl px-2 py-1.5 -mx-2 transition ${
        locked
          ? "cursor-not-allowed opacity-50"
          : "hover:bg-white/[0.04] cursor-pointer"
      } ${toggling ? "opacity-60 cursor-wait" : ""}`}
    >
      <FontAwesomeIcon
        icon={locked ? faLock : done ? faCircleCheck : faCircle}
        className={`mt-0.5 text-sm shrink-0 ${
          locked ? "text-ink/25" : done ? "text-emerald-400" : "text-violet-400/60"
        }`}
      />
      <span
        className={`leading-relaxed ${small ? "text-xs" : "text-sm"} ${
          done ? "text-ink/25 line-through" : small ? "text-ink/45" : "text-ink/55"
        }`}
      >
        {task}
      </span>
    </button>
  );
}

/* ============================================================
   Dashboard hero
============================================================ */

function MiniStat({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/[0.09] p-3">
      <div className="flex items-center gap-2 text-violet-400 mb-1.5">
        <FontAwesomeIcon icon={icon} className="text-[10px]" />
        <span className="text-[9px] uppercase tracking-wider font-bold">{label}</span>
      </div>
      <p className="text-xs sm:text-sm font-bold text-ink truncate">{value}</p>
    </div>
  );
}

function DashboardHero({ plan, progress, stats, todayEntry }) {
  const examDays = daysUntil(plan?.examDate);
  const complete = progress >= 100;
  const duration = plan.daysAvailable || getEntries(plan).length;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-violet-500/20 bg-gradient-to-br from-violet-600/[0.17] via-violet-500/[0.06] to-white/[0.02] p-5 sm:p-7">
      <div className="absolute -top-28 -right-20 w-80 h-80 rounded-full bg-violet-600/15 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-72 h-72 rounded-full bg-fuchsia-500/[0.06] blur-[100px] pointer-events-none" />

      <div className="relative grid lg:grid-cols-[1fr_auto] gap-7 items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/15 text-[9px] uppercase tracking-wider font-bold text-violet-300">
              <FontAwesomeIcon icon={faBrain} />
              AI Study Plan
            </span>
            <span
              className={`px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider font-bold ${
                complete
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-white/[0.05] text-ink/45"
              }`}
            >
              {complete ? "Completed" : "In progress"}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-ink">
            {plan.subject || "Your Study Plan"}
          </h2>

          <p className="text-sm text-ink/40 mt-2 max-w-xl leading-relaxed">
            A focused {duration}-day roadmap designed to keep your study sessions
            clear, measurable, and consistent.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6">
            <MiniStat icon={faCalendarDay} label="Duration" value={`${duration} days`} />
            <MiniStat icon={faClock} label="Daily target" value={`${plan.hoursPerDay || "—"} hrs`} />
            <MiniStat icon={faCheck} label="Tasks done" value={`${stats.completed}/${stats.total}`} />
            <MiniStat icon={faCalendarCheck} label="Exam" value={formatDate(plan.examDate)} />
          </div>

          {todayEntry && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-violet-500/15 bg-violet-500/[0.07] px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-300 flex items-center justify-center">
                <FontAwesomeIcon icon={faBullseye} className="text-xs" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-wider font-bold text-violet-300">
                  Today's target
                </p>
                <p className="text-sm font-semibold text-ink/75 truncate mt-0.5">
                  {todayEntry.focus}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6 lg:pl-6">
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-ink/30">
              Exam countdown
            </p>
            <p className="text-3xl sm:text-4xl font-black text-ink mt-1">
              {examDays === null ? "—" : examDays}
            </p>
            <p className="text-xs text-ink/30">{examDays === 1 ? "day left" : "days left"}</p>
          </div>
          <ProgressRing percent={progress} />
        </div>
      </div>

      <div className="relative mt-7">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider font-bold text-ink/35">
            Overall progress
          </span>
          <span className="text-xs font-semibold text-ink/45">
            {stats.remaining} tasks remaining
          </span>
        </div>
        <ProgressBar percent={progress} />
      </div>
    </section>
  );
}

/* ============================================================
   Today
============================================================ */

function TaskCard({ task, done, index, onToggle, toggling }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={toggling}
      aria-pressed={done}
      className={`group w-full text-left rounded-2xl border p-3.5 sm:p-4 transition-all ${
        done
          ? "border-emerald-500/15 bg-emerald-500/[0.035]"
          : "border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.045] hover:border-violet-500/20"
      } ${toggling ? "opacity-60 cursor-wait" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition ${
            done
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-white/[0.045] text-ink/20 group-hover:bg-violet-500/10 group-hover:text-violet-400"
          }`}
        >
          <FontAwesomeIcon icon={done ? faCircleCheck : faCircle} className="text-sm" />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold leading-relaxed ${
              done ? "text-ink/30 line-through" : "text-ink/75"
            }`}
          >
            {task}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[9px] uppercase tracking-wider font-bold text-violet-400/70">
              {index === 0 ? "Learn" : index === 1 ? "Practice" : index === 2 ? "Review" : "Study"}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <span className="text-[9px] text-ink/25">
              {done ? "Completed · tap to undo" : "Tap to complete"}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function TodayCard({ plan, entry, dayNumber, progress, onToggle, togglingKey }) {
  if (!entry) {
    const finished = progress >= 100;

    return (
      <section>
        <SectionTitle
          eyebrow={finished ? "Journey complete" : "Plan period ended"}
          title={finished ? "You've reached the end" : "No session today"}
          icon={faGraduationCap}
        />
        <div
          className={`rounded-[2rem] border p-8 text-center ${
            finished
              ? "border-emerald-500/15 bg-emerald-500/[0.04]"
              : "border-white/[0.07] bg-white/[0.025]"
          }`}
        >
          <div
            className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-xl ${
              finished
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-violet-500/10 text-violet-400"
            }`}
          >
            <FontAwesomeIcon icon={finished ? faCircleCheck : faCalendarCheck} />
          </div>
          <h3 className="text-xl font-bold text-ink mt-4">
            {finished ? "Plan completed" : `${progress}% of the plan completed`}
          </h3>
          <p className="text-sm text-ink/40 max-w-md mx-auto mt-2 leading-relaxed">
            {finished
              ? "You completed this roadmap. Start another plan when you're ready for your next academic goal."
              : "This plan's schedule has ended. Open the roadmap below to finish any missed tasks, or create a new plan."}
          </p>
          <Link
            to="/ai"
            className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-bold transition"
          >
            <FontAwesomeIcon icon={faRobot} />
            Create another plan
          </Link>
        </div>
      </section>
    );
  }

  const tasks = entry.tasks || [];
  const completed = tasks.filter((_, i) => isTaskDone(plan, dayNumber, i)).length;

  return (
    <section>
      <SectionTitle
        eyebrow={`Day ${dayNumber} of ${plan.daysAvailable || getEntries(plan).length}`}
        title="Today's Focus"
        icon={faBolt}
        action={
          <span className="text-xs font-bold text-ink/35">
            {completed}/{tasks.length} done
          </span>
        }
      />

      <div className="rounded-[2rem] border border-white/[0.07] bg-white/[0.025] overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-white/[0.06]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={faBookOpen} />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-violet-400">
                  Focus area
                </p>
                <h3 className="text-lg sm:text-xl font-black text-ink mt-1">
                  {entry.focus || "Study session"}
                </h3>
              </div>
            </div>

            <div className="sm:w-36">
              <div className="flex justify-between mb-1.5 text-[9px] font-bold text-ink/30 uppercase tracking-wider">
                <span>Today</span>
                <span>{tasks.length ? Math.round((completed / tasks.length) * 100) : 0}%</span>
              </div>
              <ProgressBar percent={tasks.length ? (completed / tasks.length) * 100 : 0} />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-2.5">
          {tasks.length ? (
            tasks.map((task, index) => (
              <TaskCard
                key={`${dayNumber}-${index}`}
                task={task}
                index={index}
                done={isTaskDone(plan, dayNumber, index)}
                toggling={togglingKey === `${dayNumber}-${index}`}
                onToggle={() => onToggle(dayNumber, index)}
              />
            ))
          ) : (
            <p className="text-sm text-ink/35 py-4">No specific tasks were added for today.</p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Day navigator
============================================================ */

function WeekNavigator({ plan, selectedDay, onSelect }) {
  const entries = getEntries(plan);

  return (
    <section>
      <SectionTitle eyebrow="Day by day" title="Study Roadmap" icon={faCalendarDay} />
      <div className="rounded-[2rem] border border-white/[0.07] bg-white/[0.025] p-3 sm:p-4">
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {entries.map((entry, index) => {
            const status = getDayStatus(plan, entry);
            const active = entry.day === selectedDay;

            return (
              <button
                key={entry.day ?? index}
                type="button"
                onClick={() => onSelect(entry.day)}
                aria-pressed={active}
                className={`relative rounded-2xl px-2 py-3.5 transition-all ${
                  active
                    ? "bg-violet-500 text-white shadow-lg shadow-violet-500/15"
                    : "bg-white/[0.025] text-ink/40 hover:bg-white/[0.05] hover:text-ink/70"
                }`}
              >
                <span className="block text-[9px] uppercase tracking-wider font-bold">
                  {getDayLabel(entry, index)}
                </span>
                <span className="block text-base font-black mt-1">
                  {entry.day}
                </span>
                <span className={`block text-[9px] mt-1 ${active ? "text-white/60" : "text-ink/20"}`}>
                  {status.complete ? "Done" : `${status.completed}/${status.total}`}
                </span>

                {status.complete && (
                  <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${active ? "bg-white" : "bg-emerald-400"}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Selected day
============================================================ */

function SelectedDay({ plan, entry, currentDay, onToggle, togglingKey }) {
  if (!entry) return null;
  const tasks = entry.tasks || [];
  const status = getDayStatus(plan, entry);
  const locked = !isDayUnlocked(entry.day, currentDay);

  return (
    <div className="rounded-[2rem] border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-violet-400">
            Day {entry.day}
          </p>
          <h3 className="text-lg font-bold text-ink mt-1">{entry.focus || "Study session"}</h3>
        </div>
        <span className="text-xs font-bold text-ink/30">
          {status.completed}/{status.total}
        </span>
      </div>

      {locked && (
        <p className="mt-3 text-xs text-ink/35">
          This day hasn't started yet. You can tick its tasks once it begins.
        </p>
      )}

      <div className="mt-4 space-y-0.5">
        {tasks.length ? (
          tasks.map((task, index) => (
            <TaskRow
              key={index}
              task={task}
              done={isTaskDone(plan, entry.day, index)}
              locked={locked}
              toggling={togglingKey === `${entry.day}-${index}`}
              onToggle={() => onToggle(entry.day, index)}
            />
          ))
        ) : (
          <p className="text-sm text-ink/35">No specific tasks for this day.</p>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   AI coach
============================================================ */

function CoachPill({ label }) {
  return (
    <span className="px-2.5 py-1.5 rounded-xl bg-black/[0.08] border border-white/[0.05] text-[9px] font-semibold text-ink/40">
      {label}
    </span>
  );
}

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
/* ============================================================
   Full roadmap
============================================================ */

function Roadmap({ plan, selectedDay, currentDay, onSelect, onToggle, togglingKey }) {
  const entries = getEntries(plan);
  const [open, setOpen] = useState({});

  // Selecting a day elsewhere (e.g. the day navigator) opens it here.
  useEffect(() => {
    if (selectedDay != null) {
      setOpen((prev) => ({ ...prev, [selectedDay]: true }));
    }
  }, [selectedDay]);

  return (
    <section>
      <SectionTitle
        eyebrow="Full roadmap"
        title="Every study day"
        icon={faLayerGroup}
        action={
          <span className="text-xs text-ink/25">
            {entries.length} {entries.length === 1 ? "day" : "days"}
          </span>
        }
      />

      <div className="space-y-2.5">
        {entries.map((entry) => {
          const status = getDayStatus(plan, entry);
          const active = entry.day === selectedDay;
          const expanded = open[entry.day] ?? active;
          const locked = !isDayUnlocked(entry.day, currentDay);

          return (
            <div
              key={entry.day}
              className={`rounded-2xl border overflow-hidden transition ${
                active
                  ? "border-violet-500/25 bg-violet-500/[0.045]"
                  : "border-white/[0.07] bg-white/[0.02]"
              }`}
            >
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => {
                  // A day that isn't selected yet gets selected (which opens it
                  // via the effect); an already-selected day toggles open/closed.
                  if (!active) onSelect(entry.day);
                  else setOpen((prev) => ({ ...prev, [entry.day]: !expanded }));
                }}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-black ${
                    status.complete
                      ? "bg-emerald-500/10 text-emerald-400"
                      : active
                      ? "bg-violet-500 text-white"
                      : "bg-white/[0.04] text-ink/35"
                  }`}
                >
                  {status.complete ? <FontAwesomeIcon icon={faCheck} /> : entry.day}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-ink/75">Day {entry.day}</span>
                    {active && (
                      <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-[8px] uppercase tracking-wider font-bold text-violet-400">
                        Selected
                      </span>
                    )}
                    {status.complete && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[8px] uppercase tracking-wider font-bold text-emerald-400">
                        Complete
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink/35 truncate mt-1">{entry.focus}</p>
                </div>

                <span className="text-[10px] font-bold text-ink/25 mr-1">
                  {status.completed}/{status.total}
                </span>
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`text-[10px] text-ink/20 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              </button>

              {expanded && (
                <div className="px-4 pb-4 sm:pl-16">
                  <div className="pt-2 border-t border-white/[0.05] space-y-0.5">
                    {(entry.tasks || []).map((task, index) => (
                      <TaskRow
                        key={index}
                        small
                        task={task}
                        done={isTaskDone(plan, entry.day, index)}
                        locked={locked}
                        toggling={togglingKey === `${entry.day}-${index}`}
                        onToggle={() => onToggle(entry.day, index)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ============================================================
   Past plans
============================================================ */

function PastPlanCard({ plan, isActive }) {
  const [expanded, setExpanded] = useState(false);
  const progress = computeProgress(plan);
  const stats = getTaskStats(plan);
  const entries = getEntries(plan);

  return (
    <div
      className={`rounded-2xl border transition ${
        isActive
          ? "border-violet-500/25 bg-violet-500/[0.045]"
          : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.035]"
      }`}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 sm:p-5"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={faBookOpen} className="text-sm" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-ink truncate">{plan.subject}</h3>
              {isActive && (
                <span className="px-2 py-1 rounded-full bg-violet-500/10 text-[8px] uppercase tracking-wider font-bold text-violet-400">
                  Active
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-ink/30">
              <span>{plan.daysAvailable} days</span>
              <span>{plan.hoursPerDay} hrs/day</span>
              <span>{formatDate(plan.createdAt)}</span>
            </div>
          </div>
          <FontAwesomeIcon
            icon={faChevronDown}
            className={`text-xs text-ink/20 mt-2 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] uppercase tracking-wider font-bold text-ink/25">
              Completion
            </span>
            <span className="text-[10px] font-semibold text-ink/35">
              {stats.completed}/{stats.total} · {progress}%
            </span>
          </div>
          <ProgressBar percent={progress} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 sm:px-5 pb-5">
          <div className="pt-4 border-t border-white/[0.05] space-y-4">
            {entries.length ? (
              entries.map((entry) => {
                const status = getDayStatus(plan, entry);
                return (
                  <div key={entry.day}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold text-ink/65">
                        Day {entry.day}
                        {entry.focus ? ` — ${entry.focus}` : ""}
                      </p>
                      <span className="text-[10px] font-bold text-ink/25 shrink-0">
                        {status.completed}/{status.total}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {(entry.tasks || []).map((task, index) => {
                        const done = isTaskDone(plan, entry.day, index);
                        return (
                          <div key={index} className="flex items-start gap-2.5">
                            <span
                              className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                                done ? "bg-emerald-400/50" : "bg-white/20"
                              }`}
                            />
                            <span
                              className={`text-xs leading-relaxed ${
                                done ? "text-ink/25 line-through" : "text-ink/45"
                              }`}
                            >
                              {task}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-ink/35">No day-by-day details saved for this plan.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PastPlansView({ plans, currentPlanId, error, onRetry }) {
  if (error) {
    return (
      <div className="rounded-[2rem] border border-red-500/10 bg-red-500/[0.03] p-10 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center">
          <FontAwesomeIcon icon={faRotate} />
        </div>
        <h3 className="text-lg font-bold text-ink mt-4">Couldn't load history</h3>
        <p className="text-sm text-ink/35 mt-2">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-bold transition"
        >
          <FontAwesomeIcon icon={faRotate} />
          Try Again
        </button>
      </div>
    );
  }

  if (!plans.length) {
    return (
      <div className="rounded-[2rem] border border-white/[0.07] bg-white/[0.02] p-10 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
          <FontAwesomeIcon icon={faLayerGroup} />
        </div>
        <h3 className="text-lg font-bold text-ink mt-4">No past plans yet</h3>
        <p className="text-sm text-ink/35 max-w-sm mx-auto mt-2">
          Plans you create later will appear here with their completion history.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {plans.map((plan) => (
        <PastPlanCard key={plan.id} plan={plan} isActive={plan.id === currentPlanId} />
      ))}
    </div>
  );
}

/* ============================================================
   Main page
============================================================ */

function StudyPlan() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("current");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [current, setCurrent] = useState(null);

  const [pastPlans, setPastPlans] = useState([]);
  const [pastLoading, setPastLoading] = useState(false);
  const [pastLoaded, setPastLoaded] = useState(false);
  const [pastError, setPastError] = useState(null);

  const [togglingKey, setTogglingKey] = useState(null);
  const [toggleError, setToggleError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const loadCurrent = useCallback(() => {
    setLoading(true);
    setError(null);

    apiGet("/ai/study-plan/current")
      .then((data) => {
        setCurrent(data);
        // Only set a default; never override a day the user already picked.
        if (data?.dayNumber != null) {
          setSelectedDay((prev) => prev ?? data.dayNumber);
        }
      })
      .catch(() => setError("Couldn't load your study plan."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCurrent();
  }, [loadCurrent]);

  // Load history once per visit to the tab (and again after retry / task changes).
  useEffect(() => {
    if (tab !== "past" || pastLoaded) return;

    let cancelled = false;
    setPastLoading(true);
    setPastError(null);

    apiGet("/ai/study-plan")
      .then((data) => {
        if (!cancelled) setPastPlans(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setPastError("Check your connection and try again.");
      })
      .finally(() => {
        if (!cancelled) {
          setPastLoading(false);
          setPastLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tab, pastLoaded]);

  const plan = current?.plan || null;
  const entries = useMemo(() => getEntries(plan), [plan]);
  const currentDay = current?.dayNumber ?? null;

  const todayEntry =
    current?.todayEntry ||
    entries.find((entry) => entry.day === currentDay) ||
    null;

  const selectedEntry =
    entries.find((entry) => entry.day === selectedDay) || todayEntry || entries[0] || null;

  const progress = computeProgress(plan);
  const stats = getTaskStats(plan);

  const handleToggle = async (day, taskIndex) => {
  if (!current?.plan) return;
  if (!isDayUnlocked(day, currentDay)) return;

  const key = `${day}-${taskIndex}`;
  setTogglingKey(key);
  setToggleError(null);

  // Optimistic update
  setCurrent((prev) => applyToggle(prev, day, taskIndex));

  try {
    const res = await apiPatch(`/ai/study-plan/${current.plan.id}/task`, { day, taskIndex });

    // Trust the server's version of the truth
    if (res?.completedTasks) {
      setCurrent((prev) =>
        prev?.plan
          ? { ...prev, plan: { ...prev.plan, completedTasks: res.completedTasks } }
          : prev
      );
    }
    setPastLoaded(false); // history is stale now; refetch next time it's opened
  } catch {
    // Roll back just this task instead of reloading the whole page.
    setCurrent((prev) => applyToggle(prev, day, taskIndex));
    setToggleError("Couldn't save that change. Check your connection and try again.");
  } finally {
    setTogglingKey(null);
  }
};

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-48 -left-40 w-[34rem] h-[34rem] rounded-full bg-violet-600/[0.07] blur-[140px]" />
        <div className="absolute top-[45%] -right-48 w-[30rem] h-[30rem] rounded-full bg-fuchsia-500/[0.035] blur-[140px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-bg/85 backdrop-blur-2xl border-b border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-[68px] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-9 h-9 rounded-xl border border-white/[0.06] bg-white/[0.025] text-ink/40 hover:text-violet-400 hover:border-violet-500/20 flex items-center justify-center transition"
                aria-label="Go back"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
              </button>

              <div className="min-w-0">
                <p className="text-sm font-black text-ink truncate">Study Plan</p>
                <p className="hidden sm:block text-[9px] uppercase tracking-[0.18em] text-ink/25 mt-0.5">
                  Your academic roadmap
                </p>
              </div>
            </div>

            <Link
              to="/ai"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-xs font-bold shadow-lg shadow-violet-500/10 transition"
            >
              <FontAwesomeIcon icon={faPlus} />
              <span className="hidden sm:inline">Create Plan</span>
              <span className="sm:hidden">Create</span>
            </Link>
          </div>

          <div className="flex gap-1.5 pb-3" role="tablist">
            {[
              { id: "current", label: "Overview" },
              { id: "past", label: "History" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  tab === item.id
                    ? "bg-violet-500 text-white shadow-md shadow-violet-500/10"
                    : "bg-white/[0.025] text-ink/30 hover:text-ink/65 hover:bg-white/[0.05]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-32 pb-20">
        {toggleError && (
          <div
            role="alert"
            className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-red-500/15 bg-red-500/[0.05] px-4 py-3 text-sm text-red-300"
          >
            <span>{toggleError}</span>
            <button
              type="button"
              onClick={() => setToggleError(null)}
              className="text-xs font-bold text-red-300/70 hover:text-red-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {tab === "current" && (
          <>
            {loading && (
              <div className="space-y-6">
                <Skeleton className="h-[390px]" />
                <Skeleton className="h-[270px]" />
                <Skeleton className="h-[150px]" />
                <Skeleton className="h-[360px]" />
              </div>
            )}

            {!loading && error && (
              <div className="max-w-xl mx-auto rounded-[2rem] border border-red-500/10 bg-red-500/[0.03] p-10 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center">
                  <FontAwesomeIcon icon={faRotate} />
                </div>
                <h2 className="text-lg font-bold text-ink mt-4">Something went wrong</h2>
                <p className="text-sm text-ink/35 mt-2">{error}</p>
                <button
                  type="button"
                  onClick={loadCurrent}
                  className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-bold transition"
                >
                  <FontAwesomeIcon icon={faRotate} />
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && !plan && (
              <div className="max-w-2xl mx-auto rounded-[2rem] border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.08] to-white/[0.02] p-8 sm:p-14 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-500/10 border border-violet-500/10 text-violet-400 text-2xl flex items-center justify-center">
                  <FontAwesomeIcon icon={faCalendarCheck} />
                </div>
                <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-violet-400 mt-6">
                  Your next academic goal
                </p>
                <h2 className="text-2xl sm:text-3xl font-black text-ink mt-2">
                  Build your study roadmap
                </h2>
                <p className="text-sm text-ink/40 max-w-md mx-auto mt-3 leading-relaxed">
                  Let AI turn your subject, available time, and exam target into a structured plan you can actually follow.
                </p>
                <Link
                  to="/ai"
                  className="inline-flex items-center gap-2 mt-7 px-6 py-3.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-bold shadow-lg shadow-violet-500/10 transition"
                >
                  <FontAwesomeIcon icon={faRobot} />
                  Create with AI
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                </Link>
              </div>
            )}

            {!loading && !error && plan && (
              <div className="space-y-8">
                <DashboardHero
                  plan={plan}
                  progress={progress}
                  stats={stats}
                  todayEntry={todayEntry}
                />

                <div className="grid lg:grid-cols-[1.35fr_0.65fr] gap-8 items-start">
                  <TodayCard
                    plan={plan}
                    entry={todayEntry}
                    dayNumber={currentDay}
                    progress={progress}
                    onToggle={handleToggle}
                    togglingKey={togglingKey}
                  />

                  <AICoach plan={plan} progress={progress} stats={stats} />
                </div>

                <WeekNavigator
                  plan={plan}
                  selectedDay={selectedDay}
                  onSelect={setSelectedDay}
                />

                <SelectedDay
                  plan={plan}
                  entry={selectedEntry}
                  currentDay={currentDay}
                  onToggle={handleToggle}
                  togglingKey={togglingKey}
                />

                <Roadmap
                  plan={plan}
                  selectedDay={selectedDay}
                  currentDay={currentDay}
                  onSelect={setSelectedDay}
                  onToggle={handleToggle}
                  togglingKey={togglingKey}
                />
              </div>
            )}
          </>
        )}

        {tab === "past" && (
          <section className="max-w-4xl mx-auto">
            <div className="mb-7">
              <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-violet-400">
                Study history
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-ink mt-1">
                Past Study Plans
              </h1>
              <p className="text-sm text-ink/35 mt-2">
                Review the roadmaps you've created and their completion progress.
              </p>
            </div>

            {pastLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-36" />
                <Skeleton className="h-36" />
                <Skeleton className="h-36" />
              </div>
            ) : (
              <PastPlansView
                plans={pastPlans}
                currentPlanId={plan?.id}
                error={pastError}
                onRetry={() => setPastLoaded(false)}
              />
            )}
          </section>
        )}
      </main>
    </div>
  );
}


export default StudyPlan;