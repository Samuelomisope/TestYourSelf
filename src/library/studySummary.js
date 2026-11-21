// Pure view helpers for the flashcard summary the server sends: { dueToday, decks:[{deckId,title,due,total}], streak, reviewedToday }.
export function dueByDeck(summary) {
  const map = new Map();
  for (const d of Array.isArray(summary?.decks) ? summary.decks : []) map.set(d.deckId, d.due);
  return map;
}

export function dueHeadline(summary) {
  const due = Number(summary?.dueToday) || 0;
  if (!summary) return null;
  if (due === 0) return summary.reviewedToday ? "All caught up for today" : "Nothing due right now";
  return due === 1 ? "1 card due today" : `${due} cards due today`;
}

export function streakText(summary) {
  const n = Number(summary?.streak) || 0;
  if (n <= 0) return null;
  const days = n === 1 ? "1 day" : `${n} days`;
  return summary.reviewedToday ? `${days} review streak` : `${days} streak: review a card today to keep it`;
}

/** The deck with the most due cards, or null when nothing is due. */
export function topDueDeck(summary) {
  const decks = Array.isArray(summary?.decks) ? summary.decks : [];
  const best = decks.reduce((a, d) => (d.due > (a?.due ?? 0) ? d : a), null);
  return best && best.due > 0 ? best : null;
}
