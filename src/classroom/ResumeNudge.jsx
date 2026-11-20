import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api";
import { nudgeFor, progressText, timeAgo } from "./progressView";

/** "Pick up where you left off": the most recent lesson that is under way. Quiet on any failure; the lessons list is below. */
export default function ResumeNudge() {
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  useEffect(() => {
    let alive = true;
    apiGet("/classroom/progress?limit=10").then((page) => { if (alive) setLesson(nudgeFor(page.lessons ?? [])); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!lesson) return null;
  return (
    <section aria-label="Pick up where you left off" className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 py-3">
      <p className="min-w-0 flex-1 text-sm text-ink">
        <span className="font-semibold">Pick up where you left off: </span>{lesson.title || lesson.topic}, {progressText(lesson).toLowerCase()}. Studied {timeAgo(lesson.lastStudiedAt)}.
      </p>
      <button type="button" onClick={() => navigate(`/classroom/${lesson.id}`)} className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-violet-500">Continue</button>
    </section>
  );
}
