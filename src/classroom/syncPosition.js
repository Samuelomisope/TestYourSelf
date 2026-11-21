// Keeps the whiteboard, the voice and the tutor on the same place in a lesson (Phase G). Pure functions only: the
// player decides what is playing, and everything else (board page, resume position) is derived from it here, so
// skipping, going back or pausing can never leave the board showing a different page from the one being explained.

const EVENT_ID = /^e\d{1,4}$/;

/**
 * The BOARD_PAGE event that owns the position the player is at: the last page that starts at or before the event
 * being played (or, once the reply is done, the last event). Null when the reply has no page or nothing is loaded.
 */
export function pageEventAt(player) {
  const events = Array.isArray(player?.events) ? player.events : [];
  if (!events.length || player.status === "idle") return null;
  const at = Math.min(Math.max(player.index, 0), events.length - 1);
  for (let i = at; i >= 0; i -= 1) if (events[i].type === "BOARD_PAGE") return events[i];
  return null;
}

/** Id of the event that is playing, or the last one that played; null when none has. */
export function eventIdAt(player) {
  const events = Array.isArray(player?.events) ? player.events : [];
  if (!events.length || player.status === "idle") return null;
  const playing = player.status === "playing" || player.status === "paused";
  const at = playing ? player.index : player.index - 1;
  return events[Math.min(Math.max(at, 0), events.length - 1)]?.id ?? null;
}

const whole = (value, max) => (Number.isInteger(value) && value >= 0 && value <= max ? value : null);

/**
 * What to save so another device can offer to continue: { stepIndex, eventId, boardPage }, or null when there is
 * nothing worth saving. Values are checked the same way the server checks them (v: 1 shape).
 */
export function resumePosition({ stepIndex, player, boardPage, stepCount }) {
  const step = whole(stepIndex, Number.isInteger(stepCount) ? stepCount : 0);
  const page = whole(boardPage, 99);
  if (step === null) return null;
  const id = eventIdAt(player);
  return { stepIndex: step, eventId: id && EVENT_ID.test(id) ? id : null, boardPage: page ?? 0 };
}

/** Two positions are the same place, so a save that would change nothing can be skipped. */
export const samePosition = (a, b) => (a === b) || (!!a && !!b && a.stepIndex === b.stepIndex && a.eventId === b.eventId && a.boardPage === b.boardPage);
