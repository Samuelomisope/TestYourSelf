import test from "node:test";
import assert from "node:assert/strict";
import { buildAnswers, canSubmit, checkErrorMessage, checkReducer, describeScore, initialCheck, isAnswered } from "./checkIn.js";

const qs = [
  { id: "q1", kind: "MCQ", prompt: "a", options: ["x", "y", "z"] },
  { id: "q2", kind: "TRUE_FALSE", prompt: "b" },
  { id: "q3", kind: "SHORT", prompt: "c" },
];
const run = (actions, from = initialCheck) => actions.reduce(checkReducer, from);

test("flow: open, load, answer, submit, result, retry", () => {
  let s = run([{ type: "open" }, { type: "loaded", assessment: { id: "a", questions: qs } }]);
  assert.equal(s.phase, "answering");
  s = run([{ type: "answer", id: "q1", value: { choice: 0 } }, { type: "submitting" }, { type: "result", result: { score: 1, total: 2 } }], s);
  assert.equal(s.phase, "result");
  s = run([{ type: "retry" }], s);
  assert.equal(s.phase, "answering");
  assert.deepEqual(s.answers, {});
  assert.equal(s.result, null);
});

test("ignores actions in the wrong phase", () => {
  assert.equal(run([{ type: "loaded", assessment: { id: "a", questions: qs } }]).phase, "idle");
  assert.equal(run([{ type: "answer", id: "q1", value: { choice: 0 } }]).phase, "idle");
  const loading = run([{ type: "open" }]);
  assert.equal(checkReducer(loading, { type: "result", result: {} }).phase, "loading");
  assert.equal(checkReducer(initialCheck, { type: "retry" }).phase, "idle");
});

test("a failed load shows the message and can close", () => {
  const s = run([{ type: "open" }, { type: "fail", message: "Nope" }]);
  assert.equal(s.phase, "error");
  assert.equal(s.error, "Nope");
  assert.equal(checkReducer(s, { type: "close" }).phase, "idle");
});

test("navigation stays within the questions", () => {
  const s = run([{ type: "open" }, { type: "loaded", assessment: { id: "a", questions: qs } }]);
  assert.equal(checkReducer(s, { type: "go", index: 9 }).index, 2);
  assert.equal(checkReducer(s, { type: "go", index: -3 }).index, 0);
});

test("answered and submit rules: typed answer optional, others required", () => {
  assert.ok(!isAnswered(qs[0], {}));
  assert.ok(isAnswered(qs[0], { q1: { choice: 0 } }));
  assert.ok(isAnswered(qs[1], { q2: { truth: false } }));
  assert.ok(!isAnswered(qs[2], { q3: { text: "   " } }));
  assert.ok(!canSubmit(qs, { q1: { choice: 1 } }));
  assert.ok(canSubmit(qs, { q1: { choice: 1 }, q2: { truth: true } }));
  assert.ok(!canSubmit([], {}));
});

test("buildAnswers sends only what was answered and trims text", () => {
  const body = buildAnswers(qs, { q1: { choice: 2 }, q2: { truth: false }, q3: { text: `  ${"a".repeat(500)}  ` } });
  assert.deepEqual(body[0], { questionId: "q1", choice: 2 });
  assert.deepEqual(body[1], { questionId: "q2", truth: false });
  assert.equal(body[2].text.length, 300);
  assert.equal(buildAnswers(qs, { q1: { choice: 0 }, q2: { truth: true }, q3: { text: " " } }).length, 2);
});

test("score wording and celebration thresholds", () => {
  assert.ok(describeScore(3, 3).celebrate);
  assert.ok(describeScore(4, 5).celebrate);
  assert.ok(!describeScore(3, 5).celebrate);
  assert.ok(!describeScore(1, 5).celebrate);
  assert.ok(!describeScore(0, 0).celebrate);
  assert.match(describeScore(0, 0).message, /nothing could be marked/);
});

test("error messages are actionable", () => {
  assert.match(checkErrorMessage({ status: 409, serverMessage: "Daily classroom turn quota reached." }), /tomorrow/);
  assert.equal(checkErrorMessage({ status: 409, serverMessage: "Finish the earlier steps before checking this one." }), "Finish the earlier steps before checking this one.");
  assert.match(checkErrorMessage({ status: 429 }), /too fast/);
  assert.match(checkErrorMessage(new Error("x")), /could not load/);
});

test("a failed send keeps the answers so the student can send again", () => {
  let s = run([{ type: "open" }, { type: "loaded", assessment: { id: "a", questions: qs } }, { type: "answer", id: "q1", value: { choice: 2 } }, { type: "submitting" }, { type: "fail", message: "x" }]);
  assert.equal(s.phase, "error");
  s = checkReducer(s, { type: "resume" });
  assert.equal(s.phase, "answering");
  assert.equal(s.answers.q1.choice, 2);
  assert.equal(checkReducer(initialCheck, { type: "resume" }).phase, "idle");
});
