// Small pure helpers shared by the AI Classroom components.

export const MODE_LABEL = { CLASSROOM: "Guided lesson", CONVERSATION: "Conversation" };

export const DOC_STATUS = {
  PROCESSING: "Processing…",
  READY: "Ready",
  FAILED: "Couldn't read this file",
  DELETE_PENDING: "Removing…",
  DELETE_FAILED: "Removal failed",
};

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Turns an API failure into a sentence a student can act on. api.js attaches `status` and `serverMessage`;
 * a failed fetch (offline, DNS) is a TypeError with no status.
 */
export function describeError(err, fallback, { tutor = false } = {}) {
  const status = err?.status;
  if (status === undefined) return err instanceof TypeError ? "Can't reach UniLib right now. Check your connection and try again." : err?.message || fallback;
  if (status === 429) return "You're going a little fast. Wait a few seconds and try again.";
  if (status === 503) return "AI Classroom isn't available right now. Please try again later.";
  if (status === 502 && tutor) return "The tutor couldn't answer just now. This didn't use one of your daily turns, so you can try again.";
  if (status >= 400 && status < 500 && err.serverMessage) return err.serverMessage;
  return fallback;
}

/**
 * After a failed send, should the next attempt reuse the same idempotency key? Yes when the outcome is unknown
 * (offline, timeout, server error): the server then returns the original reply instead of charging another turn.
 * No when the server gave a definite answer (rejected, or the tutor failed and the turn was returned).
 */
export function shouldKeepRequestKey(err) {
  const status = err?.status;
  if (status === undefined) return err instanceof TypeError;
  return status === 500 || status === 503 || status === 504;
}

/** Reads the stored outline defensively: anything malformed counts as "no plan". */
export function readOutline(source) {
  const raw = Array.isArray(source?.outline) ? source.outline : [];
  return raw
    .filter((step) => step && typeof step.title === "string" && step.title)
    .map((step, index) => ({ id: step.id || `step-${index + 1}`, title: step.title, summary: typeof step.summary === "string" ? step.summary : "" }));
}

export function readObjectives(source) {
  return Array.isArray(source?.objectives) ? source.objectives.filter((item) => typeof item === "string" && item) : [];
}

/** Zero-based current step, kept inside the outline. */
export function currentStep(source, total) {
  if (!total) return 0;
  const value = Number.isInteger(source?.currentStepIndex) ? source.currentStepIndex : 0;
  return Math.min(Math.max(value, 0), total - 1);
}
