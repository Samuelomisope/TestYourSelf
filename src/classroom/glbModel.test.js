import test from "node:test";
import assert from "node:assert/strict";
import { CLIPS, DRIVEN_MORPHS, VISEME_MORPHS, clipFor, faceWeights, framingFor, glbUrl } from "./glbModel.js";

test("each lecturer has its own model file", () => {
  assert.equal(glbUrl("FEMALE"), "/tutors/ada.glb");
  assert.equal(glbUrl("MALE"), "/tutors/tunde.glb");
  assert.equal(glbUrl(undefined), "/tutors/ada.glb");
});

test("every mouth shape from the lip-sync maps to a viseme morph", () => {
  assert.deepEqual(Object.keys(VISEME_MORPHS).sort(), ["aa", "ee", "ih", "oh", "ou"]);
  assert.equal(VISEME_MORPHS.ih, "viseme_I");
  assert.equal(VISEME_MORPHS.ou, "viseme_U");
});

test("talking states play the talking clip and quiet states idle", () => {
  assert.equal(clipFor("speaking").base, CLIPS.talk);
  assert.equal(clipFor("explaining").base, CLIPS.talk);
  for (const s of ["idle", "listening", "thinking", "paused"]) assert.equal(clipFor(s).base, CLIPS.idle);
});

test("a board event while talking points once; otherwise nothing extra", () => {
  assert.equal(clipFor("speaking", { type: "BOARD_BLOCK", id: "e3" }).oneShot, CLIPS.board);
  assert.equal(clipFor("explaining", { type: "BOARD_PAGE", id: "e1" }).oneShot, CLIPS.board);
  assert.equal(clipFor("speaking", { type: "SAY", id: "e2" }).oneShot, null);
  assert.equal(clipFor("idle", { type: "BOARD_BLOCK", id: "e3" }).oneShot, null);
});

test("celebrating gives a thumbs up on top of idle", () => {
  assert.deepEqual(clipFor("celebrating"), { base: CLIPS.idle, oneShot: CLIPS.praise });
});

test("face weights stay between 0 and 1 and cover every driven shape", () => {
  for (const state of ["idle", "thinking", "speaking", "listening", "explaining", "celebrating", "paused", "nonsense"]) {
    const w = faceWeights({ state, blink: 0.1, mouth: { viseme: "oh", amount: 5 } });
    assert.deepEqual(Object.keys(w).sort(), [...DRIVEN_MORPHS].sort());
    for (const v of Object.values(w)) assert.ok(v >= 0 && v <= 1, `${state} ${v}`);
  }
});

test("the blink closes the eyes and an open eye leaves them open", () => {
  assert.equal(faceWeights({ blink: 1 }).eyeBlinkLeft, 0);
  assert.equal(faceWeights({ blink: 0.1 }).eyeBlinkRight, 1);
});

test("only the current viseme opens, and the mouth is closed with no amount", () => {
  const w = faceWeights({ state: "speaking", mouth: { viseme: "ee", amount: 0.8 } });
  assert.ok(w.viseme_E > 0.5);
  for (const name of Object.values(VISEME_MORPHS).filter((n) => n !== "viseme_E")) assert.equal(w[name], 0);
  const closed = faceWeights({ state: "speaking", mouth: { viseme: "ee", amount: 0 } });
  assert.equal(closed.viseme_E, 0);
  assert.equal(closed.jawOpen, 0);
});

test("a talking mouth smiles less than a closed one", () => {
  assert.ok(faceWeights({ state: "idle", mouth: { viseme: "aa", amount: 1 } }).mouthSmile < faceWeights({ state: "idle" }).mouthSmile);
});

test("framing follows the model height and survives bad input", () => {
  assert.ok(framingFor(1.8).y > framingFor(1.66).y);
  assert.equal(framingFor(NaN).y, framingFor(1.7).y);
});
