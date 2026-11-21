import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TUTOR_LABELS, TUTOR_STATES, tutorState } from "./tutorState.js";

describe("tutorState", () => {
  it("is idle by default", () => assert.equal(tutorState(), "idle"));

  it("gives the floor to the student first, then to a reply being written", () => {
    assert.equal(tutorState({ listening: true, sending: true, speaking: true, playerStatus: "playing" }), "listening");
    assert.equal(tutorState({ sending: true, speaking: true, playerStatus: "playing" }), "thinking");
  });

  it("covers speaking, explaining silently, paused and celebrating", () => {
    assert.equal(tutorState({ playerStatus: "playing", speaking: true }), "speaking");
    assert.equal(tutorState({ playerStatus: "playing" }), "explaining");
    assert.equal(tutorState({ playerStatus: "paused", speaking: true }), "paused");
    assert.equal(tutorState({ celebrating: true, playerStatus: "playing", speaking: true }), "celebrating");
    assert.equal(tutorState({ playerStatus: "done" }), "idle");
  });

  it("only returns known states, each with a label", () => {
    for (const status of ["idle", "playing", "paused", "done"]) for (const flag of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const state = tutorState({ playerStatus: status, listening: !!(flag & 1), sending: !!(flag & 2), speaking: !!(flag & 4) });
      assert.ok(TUTOR_STATES.includes(state));
      assert.ok(TUTOR_LABELS[state]);
    }
  });
});
