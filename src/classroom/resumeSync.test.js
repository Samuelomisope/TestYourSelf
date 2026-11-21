import test from "node:test";
import assert from "node:assert/strict";
import { offerResume, readMark, shouldSave, writeMark } from "./resumeSync.js";

const memory = () => { const data = new Map(); return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }; };
const pos = (stepIndex, boardPage = 0, eventId = null) => ({ stepIndex, eventId, boardPage });
const base = { stepCount: 5, pageCount: 4, currentStep: 4 };

test("offers a saved position that differs from where the lesson opens", () => {
  assert.deepEqual(offerResume({ ...base, resume: pos(2, 1, "e3"), mark: null }), pos(2, 1, "e3"));
});

test("does not offer what this browser already saved or dismissed", () => {
  assert.equal(offerResume({ ...base, resume: pos(2, 1), mark: pos(2, 1) }), null);
});

test("does not offer when it matches the default landing (current step, last page)", () => {
  assert.equal(offerResume({ ...base, resume: pos(4, 3), mark: null }), null);
  assert.ok(offerResume({ ...base, resume: pos(4, 2), mark: null }));
});

test("ignores positions that do not fit this lesson", () => {
  assert.equal(offerResume({ ...base, resume: pos(5, 0), mark: null }), null);
  assert.equal(offerResume({ ...base, resume: pos(1, 9), mark: null }), null);
  assert.equal(offerResume({ ...base, resume: null, mark: null }), null);
  assert.equal(offerResume({ ...base, resume: { stepIndex: "1" }, mark: null }), null);
  assert.equal(offerResume({ ...base, stepCount: 0, resume: pos(0, 0), mark: null }), null);
});

test("a lesson with no board pages can still offer a step", () => {
  assert.deepEqual(offerResume({ stepCount: 3, pageCount: 0, currentStep: 2, resume: pos(1, 0), mark: null }), pos(1, 0));
});

test("marks round trip and survive missing or broken storage", () => {
  const storage = memory();
  assert.equal(writeMark(storage, "s1", pos(1, 2, "e4")), true);
  assert.deepEqual(readMark(storage, "s1"), pos(1, 2, "e4"));
  assert.equal(readMark(storage, "other"), null);
  assert.equal(writeMark(undefined, "s1", pos(1)), false);
  assert.equal(writeMark(storage, "s1", { stepIndex: -1 }), false);
  assert.equal(readMark({ getItem: () => "{not json" }, "s1"), null);
  assert.equal(writeMark({ setItem: () => { throw new Error("full"); } }, "s1", pos(1)), false);
});

test("shouldSave skips unchanged or invalid positions", () => {
  assert.ok(shouldSave(pos(1, 0), null));
  assert.ok(!shouldSave(pos(1, 0), pos(1, 0)));
  assert.ok(shouldSave(pos(1, 1), pos(1, 0)));
  assert.ok(!shouldSave(null, null));
  assert.ok(!shouldSave({ stepIndex: 1.5 }, null));
});
