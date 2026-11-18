import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { armAngles, EXPRESSION_NAMES, expressionTargets } from "./vrmMotion.js";
import { TUTOR_STATES } from "./tutorState.js";

describe("armAngles", () => {
  it("hangs both arms down at rest and mirrors them", () => {
    const rest = armAngles(0, 0);
    assert.ok(rest.left < 0 && rest.right > 0);
    assert.equal(rest.left, -rest.right);
  });
  it("raises each arm independently and ends overhead", () => {
    const up = armAngles(1, 0);
    assert.ok(up.left > 1 && up.right > 0);
    const both = armAngles(1, 1);
    assert.equal(both.left, -both.right);
    assert.ok(armAngles(0.5, 0).left > armAngles(0, 0).left);
  });
  it("keeps bad numbers within the range of motion", () => {
    assert.deepEqual(armAngles(5, -3), armAngles(1, 0));
    assert.deepEqual(armAngles(NaN, undefined), armAngles(0, 0));
  });
});

describe("expressionTargets", () => {
  it("only uses expression names a VRM model has by default", () => {
    for (const state of TUTOR_STATES) for (const key of Object.keys(expressionTargets(state, 0.5, 0.5))) assert.ok(EXPRESSION_NAMES.includes(key), `${state}: ${key}`);
  });
  it("opens the mouth only while the tutor is talking, and never wider than natural", () => {
    assert.equal(expressionTargets("speaking", 0.9).aa, 0.7);
    assert.equal(expressionTargets("explaining", 0.3).aa, 0.3);
    for (const quiet of ["idle", "thinking", "listening", "celebrating", "paused"]) assert.equal(expressionTargets(quiet, 1).aa, undefined);
  });
  it("shows the right mood for the state", () => {
    assert.equal(expressionTargets("celebrating").happy, 1);
    assert.ok(expressionTargets("listening").surprised > 0);
    assert.ok(expressionTargets("thinking").relaxed > expressionTargets("idle").relaxed);
  });
  it("blinks, except when the happy face already squints, and clamps bad input", () => {
    assert.equal(expressionTargets("idle", 0, 1).blink, 1);
    assert.equal(expressionTargets("celebrating", 0, 1).blink, 0);
    assert.equal(expressionTargets("idle", NaN, 7).blink, 1);
    assert.equal(expressionTargets("speaking", NaN).aa, 0);
    assert.deepEqual(expressionTargets("nope"), expressionTargets("paused", 0, 0));
  });
});
