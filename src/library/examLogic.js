// Pure logic for timed past-question practice.

export const SECONDS_PER_QUESTION = 90;

export function defaultMinutes(count) {
  return Math.max(1, Math.ceil((Math.max(1, Number(count) || 1) * SECONDS_PER_QUESTION) / 60));
}

/** Seconds left, never negative. A bad start time counts as a full clock so nobody is cut off by a glitch. */
export function remainingSeconds(startedAt, limitSeconds, now = Date.now()) {
  if (!Number.isFinite(startedAt) || !Number.isFinite(limitSeconds)) return Math.max(0, limitSeconds || 0);
  return Math.max(0, Math.ceil((startedAt + limitSeconds * 1000 - now) / 1000));
}

export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/** Marks every question. answers maps question index to the chosen option text. */
export function scoreExam(questions, answers) {
  const list = Array.isArray(questions) ? questions : [];
  const rows = list.map((q, index) => {
    const given = answers?.[index];
    return { index, question: q?.question, answer: q?.answer, explanation: q?.explanation, given, answered: given !== undefined, ok: given !== undefined && given === q?.answer };
  });
  const correct = rows.filter((r) => r.ok).length;
  const total = rows.length;
  return {
    rows, correct, total,
    unanswered: rows.filter((r) => !r.answered).length,
    percent: total ? Math.round((correct / total) * 100) : 0,
  };
}

export function gradeLabel(percent) {
  if (percent >= 70) return "Excellent";
  if (percent >= 50) return "Good, with room to improve";
  if (percent >= 40) return "Borderline, revise the missed topics";
  return "Needs more revision";
}

/** A guess used to pre-tick "this is a past question paper" while uploading. The person can untick it. */
export function looksLikePastQuestion(title) {
  return /\b(past\s*(questions?|papers?)|exam(ination)?s?\s*(questions?|papers?)?|test\s*questions?|\bpq\b|question\s*paper)/i.test(String(title || ""));
}
