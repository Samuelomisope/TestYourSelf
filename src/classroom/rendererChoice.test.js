import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chooseRenderer } from "./rendererChoice.js";

const ok = { premium: true, webgl: true };

describe("chooseRenderer", () => {
  it("shows 3D to a premium student with WebGL on a normal screen", () => {
    assert.deepEqual(chooseRenderer(ok), { mode: "3d", reason: "auto", canChoose: true });
  });

  it("never shows 3D without premium or WebGL, even if the student asked for it", () => {
    assert.deepEqual(chooseRenderer({ webgl: true, preference: "3d" }), { mode: "2d", reason: "premium", canChoose: false });
    assert.deepEqual(chooseRenderer({ premium: true, preference: "3d" }), { mode: "2d", reason: "webgl", canChoose: false });
  });

  it("respects reduced motion over everything else", () => {
    assert.deepEqual(chooseRenderer({ ...ok, reducedMotion: true, preference: "3d" }), { mode: "2d", reason: "motion", canChoose: false });
  });

  it("starts on 2D for phones and data saver, but lets the student pick 3D", () => {
    assert.equal(chooseRenderer({ ...ok, smallScreen: true }).reason, "mobile");
    assert.equal(chooseRenderer({ ...ok, saveData: true }).reason, "data");
    assert.equal(chooseRenderer({ ...ok, smallScreen: true, saveData: true, preference: "3d" }).mode, "3d");
  });

  it("lets a student who can have 3D choose 2D", () => {
    assert.deepEqual(chooseRenderer({ ...ok, preference: "2d" }), { mode: "2d", reason: "choice", canChoose: true });
  });

  it("treats an unknown preference as automatic and missing input as 2D", () => {
    assert.equal(chooseRenderer({ ...ok, preference: "holographic" }).mode, "3d");
    assert.equal(chooseRenderer().mode, "2d");
    for (const bad of [null, undefined, {}]) assert.equal(chooseRenderer(bad).mode, "2d");
  });
});
