import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import Navbar from "./Navbar";
import { apiGet } from "./api";
import { downloadText } from "./classroom/boardExport";
import { describeError } from "./classroom/classroomUtils";
import { FILTERS, filterLessons, lessonStage, overallStats, progressPercent, progressText, progressToCsv, timeAgo } from "./classroom/progressView";

const card = "rounded-2xl border border-ink/10 bg-bg-elevated p-5 shadow-sm";

function Stat({ label, value }) {
  return (
    <div className={`${card} !p-4`}>
      <dd className="text-2xl font-black">{value}</dd>
      <dt className="mt-1 text-xs font-semibold uppercase tracking-wider text-ink/50">{label}</dt>
    </div>
  );
}

export default function MyLearning() {
  const navigate = useNavigate();
  const alive = useRef(true);
  const [lessons, setLessons] = useState([]);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(async (before) => {
    try {
      const page = await apiGet(`/classroom/progress?limit=30${before ? `&before=${encodeURIComponent(before)}` : ""}`);
      if (!alive.current) return;
      setLessons((current) => (before ? [...current, ...page.lessons.filter((l) => !current.some((c) => c.id === l.id))] : page.lessons));
      setNext(page.next);
      setError("");
    } catch (err) {
      if (alive.current) setError(describeError(err, "Your progress could not be loaded. Try again."));
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    const timer = window.setTimeout(() => load().finally(() => alive.current && setLoading(false)), 0);
    return () => { alive.current = false; window.clearTimeout(timer); };
  }, [load]);

  const shown = useMemo(() => filterLessons(lessons, { query, filter }), [lessons, query, filter]);
  const stats = useMemo(() => overallStats(lessons), [lessons]);

  return <>
    <Navbar />
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-16 pt-36 text-ink sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/classroom" className="text-sm text-violet-600 dark:text-violet-400">← AI Classroom</Link>
          <h1 className="mt-2 text-3xl font-black">My learning</h1>
          <p className="mt-2 max-w-xl text-sm text-ink/55">Your lessons, how far you have got, and how your check-ins went.</p>
        </div>
        <button type="button" disabled={!lessons.length} onClick={() => downloadText("unilib-progress.csv", progressToCsv(lessons), "text/csv")}
          className="inline-flex items-center gap-2 rounded-xl border border-ink/15 px-4 py-2 text-sm font-semibold transition hover:border-violet-500/40 focus-visible:outline-2 focus-visible:outline-violet-500 disabled:opacity-50">
          <Download aria-hidden className="h-4 w-4" /> Download progress
        </button>
      </header>

      {loading ? <p role="status" className="text-sm text-ink/50">Loading your progress…</p> : <>
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error} <button type="button" onClick={() => load()} className="font-semibold underline">Try again</button></p>}
        <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Lessons started" value={stats.lessons} />
          <Stat label="Steps reached" value={stats.stepsReached} />
          <Stat label="Check-ins taken" value={stats.checkIns} />
          <Stat label="Average score" value={stats.average === null ? "–" : `${stats.average}%`} />
        </dl>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="min-w-0 flex-1 sm:max-w-xs">
            <span className="sr-only">Search lessons</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search lessons"
              className="w-full rounded-xl border border-ink/15 bg-bg px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-violet-500" />
          </label>
          <div role="group" aria-label="Filter lessons" className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-violet-500 ${filter === item.id ? "bg-violet-600 text-white" : "border border-ink/15 text-ink/70 hover:border-violet-500/40"}`}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {shown.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((lesson) => {
              const percent = progressPercent(lesson);
              return (
                <li key={lesson.id}>
                  <button type="button" onClick={() => navigate(`/classroom/${lesson.id}`)} className={`${card} block h-full w-full text-left transition hover:border-violet-500/40 focus-visible:outline-2 focus-visible:outline-violet-500`}>
                    <h2 className="font-bold">{lesson.title || lesson.topic}</h2>
                    <p className="mt-1 text-sm text-ink/55">{lesson.topic}</p>
                    <p className="mt-3 text-xs font-semibold text-ink/70">{progressText(lesson)}{lessonStage(lesson) === "end" ? " · reached the end" : ""}</p>
                    {lesson.stepCount > 0 && (
                      <div role="progressbar" aria-label="Progress through the lesson" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
                        <div className="h-full rounded-full bg-violet-600" style={{ width: `${percent}%` }} />
                      </div>
                    )}
                    <p className="mt-3 text-xs text-ink/55">
                      {lesson.checkedSteps ? `${lesson.checkedSteps} step${lesson.checkedSteps === 1 ? "" : "s"} checked · average ${lesson.averageBest}%` : "No check-ins yet"}
                    </p>
                    <p className="mt-1 text-xs text-ink/45">Studied {timeAgo(lesson.lastStudiedAt)}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : <div className={card}><p className="text-sm text-ink/55">{lessons.length ? "No lessons match. Clear the search or choose another filter." : "No lessons yet. Start one from AI Classroom."}</p></div>}

        {next && (
          <div className="mt-6 text-center">
            <button type="button" disabled={loadingMore} onClick={async () => { setLoadingMore(true); await load(next); if (alive.current) setLoadingMore(false); }}
              className="rounded-xl border border-ink/15 px-4 py-2 text-sm font-semibold transition hover:border-violet-500/40 disabled:opacity-50">{loadingMore ? "Loading…" : "Load older lessons"}</button>
          </div>
        )}
        <p className="mt-6 text-xs text-ink/45">Scores use your best attempt on each step. Search and filters apply to the lessons loaded so far.</p>
      </>}
    </main>
  </>;
}
