// "Continue where you left off" memory. It lives on this device only (localStorage), per account, and every read and
// write survives blocked storage. Classroom resume already follows the account on the server.
const KEY = "unilib.lastOpened.v1";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const KINDS = ["material", "deck"];

const read = (storage, userId) => {
  try {
    const all = JSON.parse(storage?.getItem(KEY) || "{}");
    const mine = all?.[userId];
    return mine && typeof mine === "object" ? mine : {};
  } catch { return {}; }
};

/** Remember the latest item of one kind. entry: { id, title, page? , card? }. */
export function rememberOpened(storage, userId, kind, entry, now = Date.now()) {
  if (!userId || !KINDS.includes(kind) || !entry?.id || !entry?.title) return;
  try {
    const all = JSON.parse(storage?.getItem(KEY) || "{}") || {};
    const mine = all[userId] && typeof all[userId] === "object" ? all[userId] : {};
    mine[kind] = { id: String(entry.id), title: String(entry.title).slice(0, 120), page: Number(entry.page) > 0 ? Math.floor(entry.page) : undefined, at: now };
    storage.setItem(KEY, JSON.stringify({ ...all, [userId]: mine }));
  } catch { /* storage full or blocked: forgetting is fine */ }
}

/** Fresh entries only, newest first. */
export function readOpened(storage, userId, now = Date.now()) {
  const mine = read(storage, userId);
  return KINDS.map((kind) => (mine[kind] ? { kind, ...mine[kind] } : null))
    .filter((e) => e && typeof e.at === "number" && now - e.at < MAX_AGE_MS && now - e.at >= -60_000)
    .sort((a, b) => b.at - a.at);
}
