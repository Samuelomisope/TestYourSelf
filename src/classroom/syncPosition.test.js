import test from "node:test";
import assert from "node:assert/strict";
import { eventIdAt, pageEventAt, resumePosition, samePosition } from "./syncPosition.js";

const ev = [
  { id: "e0", type: "STEP_START", stepIndex: 0, title: "A" },
  { id: "e1", type: "BOARD_PAGE", stepIndex: 0, title: "P1" },
  { id: "e2", type: "SAY", text: "hi" },
  { id: "e3", type: "BOARD_PAGE", stepIndex: 0, title: "P2" },
  { id: "e4", type: "SAY", text: "more" },
];
const at = (index, status = "playing") => ({ events: ev, index, status });

test("the board page follows the event being played", () => {
  assert.equal(pageEventAt(at(0)), null);
  assert.equal(pageEventAt(at(2)).id, "e1");
  assert.equal(pageEventAt(at(3)).id, "e3");
  assert.equal(pageEventAt(at(4, "paused")).id, "e3");
});

test("skipping to the end lands on the last page, not the one before", () => {
  assert.equal(pageEventAt({ events: ev, index: 5, status: "done" }).id, "e3");
});

test("nothing loaded or idle gives no page and no event", () => {
  assert.equal(pageEventAt({ events: [], index: 0, status: "idle" }), null);
  assert.equal(pageEventAt(undefined), null);
  assert.equal(eventIdAt({ events: ev, index: 0, status: "idle" }), null);
});

test("event id is the playing event, or the last one played when done", () => {
  assert.equal(eventIdAt(at(2)), "e2");
  assert.equal(eventIdAt({ events: ev, index: 5, status: "done" }), "e4");
});

test("resume position is validated like the server will", () => {
  const player = at(2);
  assert.deepEqual(resumePosition({ stepIndex: 1, player, boardPage: 3, stepCount: 4 }), { stepIndex: 1, eventId: "e2", boardPage: 3 });
  assert.equal(resumePosition({ stepIndex: 5, player, boardPage: 0, stepCount: 4 }), null);
  assert.equal(resumePosition({ stepIndex: -1, player, boardPage: 0, stepCount: 4 }), null);
  assert.equal(resumePosition({ stepIndex: 0, player, boardPage: 100, stepCount: 4 }).boardPage, 0);
  assert.equal(resumePosition({ stepIndex: 0, player: { events: [{ id: "x<script>", type: "SAY", text: "a" }], index: 0, status: "playing" }, boardPage: 0, stepCount: 1 }).eventId, null);
  assert.equal(resumePosition({ stepIndex: 2, player, boardPage: 1, stepCount: 2 }).stepIndex, 2);
});

test("samePosition", () => {
  const p = { stepIndex: 1, eventId: "e2", boardPage: 0 };
  assert.ok(samePosition(p, { ...p }));
  assert.ok(!samePosition(p, { ...p, boardPage: 1 }));
  assert.ok(!samePosition(p, null));
  assert.ok(samePosition(null, null));
});
