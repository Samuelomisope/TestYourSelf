// Playback of one tutor reply's lesson events (Phase D). A pure reducer: there are no timers here. An event
// finishes when whatever shows it (the transcript, the board, later speech) reports it with `finished`, so voice in
// Phase E only has to report the same thing. `index` is the next event to play; events before it have played.

export const initialPlayer = { events: [], index: 0, status: "idle" };

const lastIndex = (events) => events.length;
const settle = (state, index) => ({ ...state, index, status: index >= lastIndex(state.events) ? "done" : state.status === "paused" ? "paused" : "playing" });

/** Start of each page: the index of every BOARD_PAGE event, in order. */
export const pageStarts = (events) => events.flatMap((event, i) => (event.type === "BOARD_PAGE" ? [i] : []));

export function playerReducer(state, action) {
  switch (action.type) {
    case "load": {
      const events = Array.isArray(action.events) ? action.events : [];
      if (!events.length) return initialPlayer;
      // A reply opened from history is shown complete; only a reply that has just arrived is played.
      return action.instant ? { events, index: events.length, status: "done" } : { events, index: 0, status: "playing" };
    }
    case "finished": {
      // Ignore a report for anything but the event being played, so a late or duplicate report cannot skip ahead.
      if (state.status !== "playing" || state.events[state.index]?.id !== action.id) return state;
      return settle(state, state.index + 1);
    }
    case "pause": return state.status === "playing" ? { ...state, status: "paused" } : state;
    case "resume": return state.status === "paused" ? { ...state, status: "playing" } : state;
    case "next": // skip what is playing and go to the next event
      return state.status === "idle" || state.status === "done" ? state : settle(state, state.index + 1);
    case "previous": // replay the last event that finished
      return state.status === "idle" ? state : { ...state, index: Math.max(0, Math.min(state.index, lastIndex(state.events)) - 1), status: state.status === "paused" ? "paused" : "playing" };
    case "skipAll": return state.status === "idle" ? state : { ...state, index: lastIndex(state.events), status: "done" };
    case "replay": return state.events.length ? { ...state, index: 0, status: "playing" } : state;
    case "nextPage": {
      if (state.status === "idle") return state;
      // Jump to the next page after the event being played; with no later page, finish the reply.
      const next = pageStarts(state.events).find((start) => start > state.index);
      return next === undefined ? settle(state, lastIndex(state.events)) : settle(state, next);
    }
    case "previousPage": {
      // From the middle of a page go to its start; from the start of a page go to the one before.
      const starts = pageStarts(state.events);
      const playing = Math.max(0, state.index - 1);
      const here = [...starts].reverse().find((start) => start <= playing);
      const before = [...starts].reverse().find((start) => start < playing);
      // On the first page there is nothing before it, so going back restarts that page.
      const target = here !== undefined && here < playing ? here : before ?? here;
      return target === undefined ? state : { ...state, index: target, status: state.status === "paused" ? "paused" : "playing" };
    }
    default: return state;
  }
}

/** The event being played, or null when nothing is playing. */
export const currentEvent = (state) => (state.status === "playing" || state.status === "paused" ? state.events[state.index] ?? null : null);

/** Events that have played, which is everything the student should be able to see on the transcript and board. */
export const playedEvents = (state) => state.events.slice(0, state.index);

/** "Part 2 of 5" for a reply that has pages; null when it has none. */
export function pagePosition(state) {
  const starts = pageStarts(state.events);
  if (!starts.length) return null;
  const playing = Math.min(Math.max(state.index - 1, 0), state.events.length - 1);
  const number = starts.filter((start) => start <= playing).length;
  return { number: Math.max(number, 1), total: starts.length, title: state.events[starts[Math.max(number, 1) - 1]].title };
}
