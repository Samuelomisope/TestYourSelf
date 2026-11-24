// Today's Classroom allowance, as the server reports it (GET /classroom/usage). Pure helpers so the wording is tested.

/** "1:00 am" in Nigerian time, whatever the device's own time zone is. Empty when the value is not a date. */
export function formatReset(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" }).format(date).replace(/\s/g, " ").toLowerCase();
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function validUsage(usage) {
  const t = usage?.turns;
  return !!t && Number.isFinite(t.used) && Number.isFinite(t.limit) && t.limit > 0;
}

/** "6 of 10 tutor turns used today", or empty when the numbers are unknown. */
export function usageLine(usage) {
  if (!validUsage(usage)) return "";
  return `${usage.turns.used} of ${usage.turns.limit} tutor turns used today`;
}

/** A gentle heads-up for the last two turns; never shown at zero (the limit message covers that) or when plenty is left. */
export function usageWarning(usage) {
  if (!validUsage(usage)) return "";
  const left = usage.turns.remaining;
  return left > 0 && left <= 2 ? `${plural(left, "turn")} left today` : "";
}

/** The exact limit message for a turns limit, or null to fall back to the general wording. */
export function turnsLimitBody(usage, premium) {
  if (!validUsage(usage)) return null;
  const when = formatReset(usage.resetsAt);
  const kind = premium ? "" : "free ";
  return `You've used all ${usage.turns.limit} ${kind}tutor turns for today.${when ? ` They reset at ${when}.` : " They come back with the new day."} You can keep reading your lessons, notes and whiteboard in the meantime.`;
}
