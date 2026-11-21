// "Continue where you left off" across devices (Phase G3). The server keeps one saved position per lesson; this
// browser remembers the last position it saved or dismissed, so it only offers a position it has not already seen.
// Comparison is by content, never by clock, because device clocks disagree.

const KEY = "unilib.classroom.resume.";

const clean = (value) => {
  if (!value || typeof value !== "object") return null;
  const { stepIndex, eventId, boardPage } = value;
  if (!Number.isInteger(stepIndex) || stepIndex < 0) return null;
  return { stepIndex, eventId: typeof eventId === "string" && /^e\d{1,4}$/.test(eventId) ? eventId : null, boardPage: Number.isInteger(boardPage) && boardPage >= 0 && boardPage <= 99 ? boardPage : 0 };
};

const same = (a, b) => !!a && !!b && a.stepIndex === b.stepIndex && a.eventId === b.eventId && a.boardPage === b.boardPage;

export function readMark(storage, sessionId) {
  try { return clean(JSON.parse(storage?.getItem(KEY + sessionId) ?? "null")); } catch { return null; }
}

export function writeMark(storage, sessionId, position) {
  const value = clean(position);
  if (!storage || !value) return false;
  try { storage.setItem(KEY + sessionId, JSON.stringify(value)); return true; } catch { return false; }
}

/**
 * The position to offer, or null. Offered only when the server has a valid position this browser has not already saved
 * or dismissed, it points at a board page that exists, and it is not where the lesson would open anyway.
 */
export function offerResume({ resume, mark, stepCount, pageCount, currentStep }) {
  const saved = clean(resume);
  if (!saved || same(saved, clean(mark))) return null;
  if (!(stepCount > 0) || saved.stepIndex >= stepCount) return null;
  const lastPage = Math.max(pageCount - 1, 0);
  const boardPage = Math.min(saved.boardPage, lastPage);
  if (pageCount > 0 && saved.boardPage > lastPage) return null;
  if (saved.stepIndex === currentStep && boardPage === lastPage) return null;
  return { ...saved, boardPage };
}

/** Save only a real, changed position. */
export const shouldSave = (next, lastSaved) => !!clean(next) && !same(clean(next), clean(lastSaved));
