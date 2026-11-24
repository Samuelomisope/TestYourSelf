// Turns the server's feature-usage report into rows an admin can read: sorted, with bar widths and a plain label.

export const WINDOWS = [7, 30, 90];

/** "opened" ranks by how many people opened the section; "used" by how many did something in it. */
export function rankFeatures(features, by = "opened") {
  const list = Array.isArray(features) ? features.filter((f) => f && typeof f.key === "string") : [];
  const people = (f) => (by === "used" ? Number(f.users) || 0 : Number(f.visitors) || 0);
  const times = (f) => (by === "used" ? Number(f.actions) || 0 : Number(f.visits) || 0);
  return [...list].sort((a, b) => people(b) - people(a) || times(b) - times(a) || String(a.label).localeCompare(String(b.label)));
}

/** Bar width as a whole percent of the top row; a row with any activity keeps a visible sliver. */
export function barPercent(value, max) {
  const v = Number(value) || 0;
  const m = Number(max) || 0;
  if (v <= 0 || m <= 0) return 0;
  return Math.max(3, Math.round((v / m) * 100));
}

/** Share of a section's people who are on a paid plan, as a rounded percent, or null when nobody. */
export function premiumShare(premium, total) {
  const t = Number(total) || 0;
  return t > 0 ? Math.round(((Number(premium) || 0) / t) * 100) : null;
}

/** A sentence about how much visit data there is, so a short history is not mistaken for low use. */
export function coverageNote(report, today = new Date()) {
  const since = report?.visitsTrackedSince;
  if (!since) return "Section visits have not been counted yet. They start counting once this update is live.";
  const first = new Date(`${since}T00:00:00Z`);
  const days = Math.max(1, Math.floor((today.getTime() - first.getTime()) / 86_400_000) + 1);
  const wanted = Number(report?.days) || 0;
  return days < wanted
    ? `Visits have been counted for only ${days} day${days === 1 ? "" : "s"} (since ${since}), so "Opened" covers less than the ${wanted} days shown. "Used" covers the full period.`
    : `Visits have been counted since ${since}.`;
}
