import { readOutline, currentStep } from "../classroom/classroomUtils.js";

const DAY = 86_400_000;

/** Whole days from today to the exam, in the person's own calendar days. null when there is no usable date. */
export function daysToExam(examDate, now = new Date()) {
  if (!examDate) return null;
  const target = new Date(examDate);
  if (Number.isNaN(target.getTime())) return null;
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOf(target) - startOf(now)) / DAY);
}

export function examLabel(days) {
  if (days == null) return null;
  if (days < 0) return "Exam date has passed";
  if (days === 0) return "Exam is today";
  if (days === 1) return "1 day to your exam";
  return `${days} days to your exam`;
}

/** The newest classroom lesson from the sessions list, as a Continue candidate. */
export function lessonCandidate(sessions) {
  const list = (Array.isArray(sessions) ? sessions : []).filter((s) => s && s.id && !["DELETING", "DELETE_FAILED"].includes(s.status));
  list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const s = list[0];
  if (!s) return null;
  const total = s.mode === "CLASSROOM" ? readOutline(s).length : 0;
  return {
    kind: "lesson", title: s.title || s.topic || "AI Classroom lesson", href: `/classroom/${s.id}`,
    detail: total ? `Step ${currentStep(s, total) + 1} of ${total}` : "AI Classroom",
    at: new Date(s.updatedAt).getTime(),
  };
}

/** Local entries (material, deck) as Continue candidates. */
export function localCandidates(entries) {
  return entries.map((e) => (e.kind === "material"
    ? { kind: "material", title: e.title, href: `/study-material?open=${encodeURIComponent(e.id)}${e.page ? `&page=${e.page}` : ""}`, detail: e.page ? `Page ${e.page}` : "Study material", at: e.at }
    : { kind: "deck", title: e.title, href: `/flashcards?deck=${encodeURIComponent(e.id)}`, detail: "Flashcards", at: e.at }));
}

/** The single most recent thing across the device memory and the account's latest lesson. */
export function pickContinue(candidates) {
  return candidates.filter(Boolean).sort((a, b) => b.at - a.at)[0] || null;
}
