// Helpers for the "My learning" page (Phase I). Pure: numbers in, labels and files out.

export const WEAK_CUTOFF = 60;

/** Where a lesson stands: not begun, in progress, or at its last step. */
export function lessonStage(lesson) {
  if (!lesson?.started) return "new";
  return lesson.stepCount > 0 && lesson.stepIndex >= lesson.stepCount - 1 ? "end" : "going";
}

export const FILTERS = [
  { id: "all", label: "All" },
  { id: "going", label: "In progress" },
  { id: "end", label: "Reached the end" },
  { id: "new", label: "Not started" },
  { id: "archived", label: "Archived" },
];

/** Search by title or topic and filter by stage. Archived lessons are hidden except under their own filter. */
export function filterLessons(lessons, { query = "", filter = "all" } = {}) {
  const q = query.trim().toLowerCase();
  return lessons.filter((lesson) => {
    const archived = lesson.status === "ARCHIVED";
    if (filter === "archived") { if (!archived) return false; }
    else if (archived) return false;
    else if (filter !== "all" && lessonStage(lesson) !== filter) return false;
    return !q || `${lesson.title} ${lesson.topic}`.toLowerCase().includes(q);
  });
}

export function progressText(lesson) {
  if (!lesson.stepCount) return lesson.started ? "Conversation" : "Not started";
  if (!lesson.started) return `${lesson.stepCount} steps · not started`;
  return `Step ${lesson.stepIndex + 1} of ${lesson.stepCount}`;
}

/** Share of the plan reached, 0 to 100. */
export function progressPercent(lesson) {
  if (!lesson.started || !lesson.stepCount) return 0;
  return Math.round(((lesson.stepIndex + 1) / lesson.stepCount) * 100);
}

/** Simple totals across the loaded lessons. Nothing is estimated: no check-ins means no average. */
export function overallStats(lessons) {
  const live = lessons.filter((l) => l.status !== "ARCHIVED");
  const scored = live.filter((l) => l.averageBest !== null);
  return {
    lessons: live.filter((l) => l.started).length,
    stepsReached: live.reduce((sum, l) => sum + (l.started ? l.stepIndex + 1 : 0), 0),
    checkIns: live.reduce((sum, l) => sum + l.attempts, 0),
    average: scored.length ? Math.round(scored.reduce((sum, l) => sum + l.averageBest, 0) / scored.length) : null,
  };
}

/** Steps whose best score is under the cut-off, weakest first. Steps never checked are not weak spots. */
export function weakSteps(steps, cutoff = WEAK_CUTOFF) {
  return steps
    .filter((s) => s.best?.total > 0 && (s.best.score / s.best.total) * 100 < cutoff)
    .sort((a, b) => a.best.score / a.best.total - b.best.score / b.best.total || a.stepIndex - b.stepIndex);
}

export function percentOf(score) {
  return score?.total > 0 ? Math.round((score.score / score.total) * 100) : null;
}

/** The lesson to offer "pick up where you left off" for: the most recently studied one that is under way. */
export function nudgeFor(lessons) {
  return [...lessons]
    .filter((l) => l.status === "ACTIVE" && lessonStage(l) === "going")
    .sort((a, b) => Date.parse(b.lastStudiedAt) - Date.parse(a.lastStudiedAt))[0] ?? null;
}

export function timeAgo(iso, now = Date.now()) {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const minutes = Math.max(0, Math.round((now - then) / 60000));
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : days < 60 ? `${days} days ago` : `${Math.round(days / 30)} months ago`;
}

// A cell that starts with = + - @ would be run as a formula by spreadsheet apps, and titles are user text.
function cell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A CSV of the loaded lessons, built in the browser. */
export function progressToCsv(lessons) {
  const header = ["Lesson", "Topic", "Status", "Step reached", "Steps", "Checked steps", "Check-in attempts", "Average best score (%)", "Last studied"];
  const stage = { new: "Not started", going: "In progress", end: "Reached the end" };
  const rows = lessons.map((l) => [
    l.title, l.topic, l.status === "ARCHIVED" ? "Archived" : stage[lessonStage(l)],
    l.started && l.stepCount ? l.stepIndex + 1 : "", l.stepCount || "", l.checkedSteps, l.attempts, l.averageBest ?? "", l.lastStudiedAt,
  ]);
  return `${[header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
}
