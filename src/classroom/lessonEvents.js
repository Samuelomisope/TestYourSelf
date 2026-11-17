// Reads the lesson events the server stores on each tutor reply (Phase D) and turns them into whiteboard pages.
// Everything here is pure and defensive: stored data is untrusted, older replies have no events, and a newer server
// may add event types or block kinds this client does not know yet. Those are skipped, never fatal.

export const KNOWN_EVENTS = ["STEP_START", "SAY", "BOARD_PAGE", "BOARD_BLOCK", "CHECK"];
export const KNOWN_BLOCKS = ["TEXT", "LIST", "FORMULA", "TABLE", "DIAGRAM", "CHART"];

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.length > 0;

function validEvent(event) {
  if (!isObject(event) || !isText(event.id) || !KNOWN_EVENTS.includes(event.type)) return false;
  switch (event.type) {
    case "STEP_START": return Number.isInteger(event.stepIndex) && typeof event.title === "string";
    case "SAY": return isText(event.text);
    case "BOARD_PAGE": return typeof event.title === "string" && (event.stepIndex === null || Number.isInteger(event.stepIndex));
    case "BOARD_BLOCK": return isObject(event.block) && KNOWN_BLOCKS.includes(event.block.kind);
    case "CHECK": return isText(event.question);
    default: return false;
  }
}

/**
 * The playable events of one structured lesson, in order. Returns [] for replies without events (older turns, the
 * plain-text fallback, or a version this client does not understand), so callers can show the normal lesson view.
 */
export function readEvents(lesson) {
  if (!isObject(lesson) || !Number.isInteger(lesson.eventsVersion) || lesson.eventsVersion < 1) return [];
  if (!Array.isArray(lesson.events)) return [];
  const seen = new Set();
  const events = [];
  for (const event of lesson.events) {
    if (!validEvent(event) || seen.has(event.id)) continue;
    seen.add(event.id);
    events.push(event);
  }
  return events;
}

/**
 * Replays every tutor reply, oldest first, into whiteboard pages. A BOARD_PAGE starts a new page; blocks go on the
 * current page, so an in-context answer (no BOARD_PAGE) adds to the board instead of replacing it. A reply that
 * draws before any page exists gets an untitled one. This is how the board is rebuilt after a reload: no extra request.
 */
export function buildBoard(turns) {
  const pages = [];
  for (const turn of Array.isArray(turns) ? turns : []) {
    if (turn?.role !== "TUTOR") continue;
    for (const event of readEvents(turn.structuredLesson)) {
      if (event.type === "BOARD_PAGE") {
        pages.push({ key: `${turn.id}:${event.id}`, turnId: turn.id, stepIndex: event.stepIndex, title: event.title, blocks: [] });
      } else if (event.type === "BOARD_BLOCK") {
        if (!pages.length) pages.push({ key: `${turn.id}:start`, turnId: turn.id, stepIndex: null, title: "", blocks: [] });
        pages[pages.length - 1].blocks.push({ key: `${turn.id}:${event.id}`, turnId: turn.id, eventId: event.id, ...event.block });
      }
    }
  }
  return pages;
}

/** The transcript lines (SAY events) of one reply, for reading along and, later, for speech. */
export const transcriptOf = (events) => events.filter((event) => event.type === "SAY");
