import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { approach, initialMotion, motionTargets, stepMotion, talkRhythm } from "./tutorMotion.js";
import { TUTOR_STATES } from "./tutorState.js";

describe("motionTargets", () => {
  it("gives finite, in-range numbers for every state", () => {
    for (const state of TUTOR_STATES) {
      const t = motionTargets(state);
      for (const key of ["headTilt", "armLeft", "armRight", "mouth", "eyes", "bob"]) assert.ok(Number.isFinite(t[key]), `${state}.${key}`);
      assert.ok(t.armLeft >= 0 && t.armLeft <= 1 && t.armRight >= 0 && t.armRight <= 1);
      assert.ok(t.mouth >= 0 && t.mouth <= 1);
      assert.ok(t.eyes > 0 && t.eyes <= 1.5);
    }
  });

  it("matches what the states mean", () => {
    assert.equal(motionTargets("speaking").talking, true);
    assert.equal(motionTargets("idle").talking, false);
    assert.ok(motionTargets("celebrating").armLeft > 0.5 && motionTargets("celebrating").armRight > 0.5);
    assert.ok(motionTargets("explaining").armRight > 0 && motionTargets("explaining").armLeft === 0);
    assert.ok(motionTargets("listening").headTilt > 0);
    assert.equal(motionTargets("paused").bob, 0);
    assert.ok(motionTargets("celebrating").eyes < 0.5); // happy, squinting eyes
  });

  it("treats an unknown state as idle", () => assert.deepEqual(motionTargets("nope"), motionTargets("idle")));
});

describe("approach", () => {
  it("moves towards the target without overshooting, faster for longer frames", () => {
    const a = approach(0, 1, 0.016);
    const b = approach(0, 1, 0.05);
    assert.ok(a > 0 && a < b && b < 1);
    assert.ok(approach(0.99, 1, 0.1) <= 1);
  });
  it("reaches the same place whether time passes in one frame or two", () => {
    const one = approach(0, 1, 0.1);
    const two = approach(approach(0, 1, 0.05), 1, 0.05);
    assert.ok(Math.abs(one - two) < 1e-9);
  });
  it("stays put for a bad frame time and recovers from bad numbers", () => {
    for (const dt of [0, -1, NaN, undefined]) assert.equal(approach(0.4, 1, dt), 0.4);
    assert.equal(approach(NaN, 1, 0.016), 1);
    assert.equal(approach(0.4, NaN, 0.016), 0.4);
    assert.equal(approach(NaN, NaN, 0.016), 0);
  });
  it("ignores a long stall instead of jumping", () => assert.equal(approach(0, 1, 10), approach(0, 1, 0.1)));
});

describe("talkRhythm", () => {
  it("stays between 0 and 1 and keeps changing", () => {
    const values = Array.from({ length: 200 }, (_, i) => talkRhythm(i * 0.016));
    assert.ok(values.every((v) => v >= 0 && v <= 1));
    assert.ok(Math.max(...values) - Math.min(...values) > 0.4);
    assert.equal(talkRhythm(NaN), talkRhythm(0));
  });
});

describe("stepMotion", () => {
  it("moves a character towards the state over several frames and settles", () => {
    const values = initialMotion();
    for (let i = 0; i < 120; i++) stepMotion(values, "celebrating", 0.016, i * 0.016);
    const target = motionTargets("celebrating");
    assert.ok(Math.abs(values.armLeft - target.armLeft) < 0.02);
    assert.ok(Math.abs(values.eyes - target.eyes) < 0.02);
  });
  it("keeps the mouth moving while talking and still when not", () => {
    const talking = initialMotion();
    const mouths = [];
    for (let i = 0; i < 100; i++) { stepMotion(talking, "speaking", 0.016, i * 0.016); mouths.push(talking.mouth); }
    assert.ok(Math.max(...mouths.slice(30)) - Math.min(...mouths.slice(30)) > 0.2);
    const quiet = initialMotion();
    for (let i = 0; i < 100; i++) stepMotion(quiet, "paused", 0.016, i * 0.016);
    assert.ok(Math.abs(quiet.mouth - motionTargets("paused").mouth) < 0.01);
  });
  it("follows a given mouth amount while talking instead of the rhythm, and ignores it when quiet", () => {
    const talking = initialMotion();
    for (let i = 0; i < 100; i++) stepMotion(talking, "speaking", 0.016, i * 0.016, 0.8);
    assert.ok(Math.abs(talking.mouth - 0.8) < 0.02);
    const quiet = initialMotion();
    for (let i = 0; i < 100; i++) stepMotion(quiet, "idle", 0.016, i * 0.016, 0.8);
    assert.ok(Math.abs(quiet.mouth - motionTargets("idle").mouth) < 0.02);
  });
  it("blinks briefly on a regular beat and never throws on a bad clock", () => {
    const v = initialMotion();
    assert.equal(stepMotion(v, "idle", 0.016, 1).blink, 1);
    assert.equal(stepMotion(v, "idle", 0.016, 4.1).blink, 0.1);
    assert.doesNotThrow(() => stepMotion(v, "idle", 0.016, NaN));
    assert.equal(stepMotion(v, "idle", 0.016, NaN).blink, 1);
  });
});
