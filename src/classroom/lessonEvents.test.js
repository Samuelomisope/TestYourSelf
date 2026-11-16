import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBoard, readEvents, transcriptOf } from "./lessonEvents.js";
import { currentEvent, initialPlayer, pagePosition, pageStarts, playedEvents, playerReducer } from "./lessonPlayer.js";

const page = (id, title, stepIndex = 0) => ({ id, type: "BOARD_PAGE", stepIndex, title });
const say = (id, text = "hello") => ({ id, type: "SAY", text });
const block = (id, kind = "TEXT") => ({ id, type: "BOARD_BLOCK", block: { kind, text: "t" } });
const reply = (events, over = {}) => ({ schemaVersion: 2, eventsVersion: 1, events, ...over });

// Three pages: events 0 STEP_START, 1 page A, 2 say, 3 block, 4 page B, 5 say, 6 page C, 7 check.
const lesson = [
  { id: "e0", type: "STEP_START", stepIndex: 0, title: "A" }, page("e1", "A"), say("e2"), block("e3"),
  page("e4", "B", 1), say("e5"), page("e6", "C", 2), { id: "e7", type: "CHECK", question: "Why?" },
];

const run = (state, ...actions) => actions.reduce(playerReducer, state);
const started = () => playerReducer(initialPlayer, { type: "load", events: lesson });

describe("readEvents", () => {
  it("returns the events of a valid reply in order", () => {
    assert.deepEqual(readEvents(reply(lesson)).map((e) => e.id), lesson.map((e) => e.id));
  });

  it("returns nothing for replies without events or with an unknown version", () => {
    for (const value of [null, undefined, "x", [], {}, { events: lesson }, reply(lesson, { eventsVersion: 0 }), reply(lesson, { eventsVersion: "1" }), reply("nope")]) {
      assert.deepEqual(readEvents(value), []);
    }
  });

  it("skips unknown, malformed and repeated events instead of failing", () => {
    const messy = [say("a"), { id: "b", type: "VOICE_CUE", ms: 10 }, { type: "SAY", text: "no id" }, say("a", "dup"), { id: "c", type: "SAY", text: "" }, null, 4,
      { id: "d", type: "BOARD_BLOCK", block: { kind: "HOLOGRAM" } }, { id: "e", type: "BOARD_BLOCK", block: null }, block("f")];
    assert.deepEqual(readEvents(reply(messy)).map((e) => e.id), ["a", "f"]);
  });

  it("accepts a newer events version, keeping only what it knows", () => {
    assert.deepEqual(readEvents(reply([say("a"), { id: "x", type: "AVATAR", state: "happy" }], { eventsVersion: 2 })).map((e) => e.id), ["a"]);
  });

  it("lists the transcript lines", () => {
    assert.deepEqual(transcriptOf(readEvents(reply(lesson))).map((e) => e.id), ["e2", "e5"]);
  });
});

describe("buildBoard", () => {
  const turn = (id, events, role = "TUTOR") => ({ id, role, structuredLesson: reply(events) });

  it("starts a page for each BOARD_PAGE and puts blocks on the current one", () => {
    const pages = buildBoard([turn("t1", lesson)]);
    assert.deepEqual(pages.map((p) => [p.title, p.blocks.length]), [["A", 1], ["B", 0], ["C", 0]]);
    assert.equal(pages[0].blocks[0].key, "t1:e3");
    assert.equal(pages[0].blocks[0].kind, "TEXT");
  });

  it("adds an in-context answer to the current page instead of starting a new one", () => {
    const pages = buildBoard([turn("t1", [page("e1", "A"), block("e2")]), turn("t2", [say("e1"), block("e2", "FORMULA")])]);
    assert.equal(pages.length, 1);
    assert.deepEqual(pages[0].blocks.map((b) => [b.key, b.kind]), [["t1:e2", "TEXT"], ["t2:e2", "FORMULA"]]);
  });

  it("ignores student turns and replies without events", () => {
    const pages = buildBoard([{ id: "s", role: "STUDENT", structuredLesson: reply([page("e1", "X")]) }, { id: "t", role: "TUTOR", structuredLesson: { schemaVersion: 2 } }, turn("t3", [page("e1", "Y")])]);
    assert.deepEqual(pages.map((p) => p.title), ["Y"]);
  });

  it("gives blocks drawn before any page an untitled page, and copes with bad input", () => {
    assert.deepEqual(buildBoard([turn("t1", [block("e1")])]).map((p) => [p.title, p.blocks.length]), [["", 1]]);
    assert.deepEqual(buildBoard(null), []);
    assert.deepEqual(buildBoard([null, undefined, 5]), []);
  });

  it("keeps keys unique across turns that reuse event ids", () => {
    const keys = buildBoard([turn("t1", [page("e1", "A"), block("e2")]), turn("t2", [page("e1", "B"), block("e2")])]).flatMap((p) => [p.key, ...p.blocks.map((b) => b.key)]);
    assert.equal(new Set(keys).size, keys.length);
  });
});

describe("playerReducer", () => {
  it("plays a new reply from the start and shows an opened one complete", () => {
    assert.deepEqual(started(), { events: lesson, index: 0, status: "playing" });
    assert.deepEqual(playerReducer(initialPlayer, { type: "load", events: lesson, instant: true }), { events: lesson, index: 8, status: "done" });
    assert.deepEqual(playerReducer(started(), { type: "load", events: [] }), initialPlayer);
    assert.deepEqual(playerReducer(initialPlayer, { type: "load", events: "bad" }), initialPlayer);
  });

  it("advances only when the current event reports it has finished", () => {
    let state = run(started(), { type: "finished", id: "e0" });
    assert.equal(state.index, 1);
    assert.equal(playerReducer(state, { type: "finished", id: "e5" }), state); // wrong event
    assert.equal(playerReducer(state, { type: "finished", id: "e0" }), state); // already reported
  });

  it("finishes after the last event", () => {
    let state = started();
    for (const event of lesson) state = playerReducer(state, { type: "finished", id: event.id });
    assert.deepEqual([state.index, state.status], [8, "done"]);
    assert.equal(currentEvent(state), null);
    assert.equal(playedEvents(state).length, 8);
  });

  it("ignores reports while paused and carries on after resuming", () => {
    let state = run(started(), { type: "pause" });
    assert.equal(playerReducer(state, { type: "finished", id: "e0" }), state);
    state = run(state, { type: "resume" });
    assert.equal(playerReducer(state, { type: "finished", id: "e0" }).index, 1);
    assert.equal(playerReducer(started(), { type: "resume" }).status, "playing");
    assert.equal(playerReducer(initialPlayer, { type: "pause" }), initialPlayer);
  });

  it("next skips what is playing and stays paused if paused", () => {
    assert.equal(playerReducer(started(), { type: "next" }).index, 1);
    assert.equal(run(started(), { type: "pause" }, { type: "next" }).status, "paused");
    const last = { ...started(), index: 7 };
    assert.deepEqual(playerReducer(last, { type: "next" }).status, "done");
    const done = playerReducer(initialPlayer, { type: "load", events: lesson, instant: true });
    assert.equal(playerReducer(done, { type: "next" }), done);
  });

  it("previous replays the last finished event and never goes below the start", () => {
    assert.equal(run(started(), { type: "next" }, { type: "next" }, { type: "previous" }).index, 1);
    assert.equal(playerReducer(started(), { type: "previous" }).index, 0);
    const done = playerReducer(initialPlayer, { type: "load", events: lesson, instant: true });
    assert.deepEqual([playerReducer(done, { type: "previous" }).index, playerReducer(done, { type: "previous" }).status], [7, "playing"]);
    assert.equal(playerReducer(initialPlayer, { type: "previous" }), initialPlayer);
  });

  it("skipAll shows everything; replay starts over", () => {
    const state = run(started(), { type: "skipAll" });
    assert.deepEqual([state.index, state.status], [8, "done"]);
    assert.deepEqual([run(state, { type: "replay" }).index, run(state, { type: "replay" }).status], [0, "playing"]);
    assert.equal(playerReducer(initialPlayer, { type: "replay" }), initialPlayer);
  });

  it("moves between pages", () => {
    assert.deepEqual(pageStarts(lesson), [1, 4, 6]);
    let state = started();
    state = playerReducer(state, { type: "nextPage" });
    assert.equal(state.index, 1);
    state = playerReducer(state, { type: "nextPage" });
    assert.equal(state.index, 4);
    state = playerReducer(state, { type: "nextPage" });
    assert.equal(state.index, 6);
    assert.deepEqual([playerReducer(state, { type: "nextPage" }).index, playerReducer(state, { type: "nextPage" }).status], [8, "done"]);
  });

  it("previousPage goes to the start of this page, then to the one before", () => {
    const middle = { ...started(), index: 6 }; // event 5 (page B's speech) was the last to play
    assert.equal(playerReducer(middle, { type: "previousPage" }).index, 4);
    const atStart = { ...started(), index: 5 }; // only page B's first event has played
    assert.equal(playerReducer(atStart, { type: "previousPage" }).index, 1);
    // On the first page there is no earlier one, so it restarts that page; before any page has played nothing changes.
    assert.equal(playerReducer({ ...started(), index: 3 }, { type: "previousPage" }).index, 1);
    assert.equal(playerReducer({ ...started(), index: 2 }, { type: "previousPage" }).index, 1);
    assert.equal(playerReducer(started(), { type: "previousPage" }).index, 0);
  });

  it("reports where the student is", () => {
    assert.deepEqual(pagePosition({ ...started(), index: 6 }), { number: 2, total: 3, title: "B" });
    assert.deepEqual(pagePosition(started()), { number: 1, total: 3, title: "A" });
    assert.equal(pagePosition({ events: [say("a")], index: 0, status: "playing" }), null);
    assert.equal(pagePosition(initialPlayer), null);
  });

  it("returns the same state for unknown actions", () => {
    const state = started();
    assert.equal(playerReducer(state, { type: "dance" }), state);
  });
});
