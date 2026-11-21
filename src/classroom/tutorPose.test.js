import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { missingPoses, poseFor, POSE_STATES } from "./tutorPose.js";
import { TUTOR_STATES } from "./tutorState.js";

const EYES = ["open", "wide", "up", "happy"];
const MOUTHS = ["smile", "neutral", "small", "talk", "grin"];
const ARMS = ["down", "point", "up"];
const ACCESSORIES = ["none", "dots", "sparkles", "waves", "pause"];

describe("poseFor", () => {
  it("has a look for every tutor state, and no extras", () => {
    assert.deepEqual(missingPoses(), []);
    assert.deepEqual([...POSE_STATES].sort(), [...TUTOR_STATES].sort());
  });

  it("only uses looks the renderers can draw", () => {
    for (const state of TUTOR_STATES) {
      const pose = poseFor(state);
      assert.ok(EYES.includes(pose.eyes), state);
      assert.ok(MOUTHS.includes(pose.mouth), state);
      assert.ok(ARMS.includes(pose.arms), state);
      assert.ok(ACCESSORIES.includes(pose.accessory), state);
      assert.ok(["flat", "raised"].includes(pose.brows), state);
      assert.ok(Math.abs(pose.tilt) <= 10, state);
    }
  });

  it("makes the states look different where it matters", () => {
    assert.equal(poseFor("speaking").mouth, "talk");
    assert.equal(poseFor("explaining").arms, "point");
    assert.equal(poseFor("celebrating").arms, "up");
    assert.equal(poseFor("thinking").accessory, "dots");
    assert.equal(poseFor("listening").accessory, "waves");
    assert.notEqual(poseFor("idle").mouth, poseFor("speaking").mouth);
  });

  it("falls back to idle for anything unknown", () => {
    for (const bad of ["dancing", "", null, undefined, 5]) assert.deepEqual(poseFor(bad), poseFor("idle"));
  });
});
