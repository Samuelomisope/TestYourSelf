import test from "node:test";
import assert from "node:assert/strict";
import { filterLessons, lessonStage, nudgeFor, overallStats, percentOf, progressPercent, progressText, progressToCsv, timeAgo, weakSteps } from "./progressView.js";

const lesson = (over = {}) => ({ id: "1", title: "Limits", topic: "Calculus", status: "ACTIVE", mode: "CLASSROOM", stepCount: 4, stepIndex: 1, started: true, checkedSteps: 1, attempts: 2, averageBest: 80, lastStudiedAt: "2026-11-18T10:00:00.000Z", lastAttemptAt: null, ...over });

test("stage: new, going, end", () => {
  assert.equal(lessonStage(lesson({ started: false })), "new");
  assert.equal(lessonStage(lesson()), "going");
  assert.equal(lessonStage(lesson({ stepIndex: 3 })), "end");
  assert.equal(lessonStage(lesson({ stepCount: 0 })), "going");
  assert.equal(lessonStage(undefined), "new");
});

test("filtering by text and stage, with archived kept apart", () => {
  const all = [lesson(), lesson({ id: "2", title: "Vectors", topic: "Physics", started: false }), lesson({ id: "3", title: "Old", status: "ARCHIVED" }), lesson({ id: "4", title: "Done", stepIndex: 3 })];
  const ids = (opts) => filterLessons(all, opts).map((l) => l.id);
  assert.deepEqual(ids({}), ["1", "2", "4"]);
  assert.deepEqual(ids({ filter: "going" }), ["1"]);
  assert.deepEqual(ids({ filter: "end" }), ["4"]);
  assert.deepEqual(ids({ filter: "new" }), ["2"]);
  assert.deepEqual(ids({ filter: "archived" }), ["3"]);
  assert.deepEqual(ids({ query: "  PHYS " }), ["2"]);
  assert.deepEqual(ids({ query: "old" }), []);
  assert.deepEqual(ids({ filter: "archived", query: "old" }), ["3"]);
});

test("progress text and percent", () => {
  assert.equal(progressText(lesson()), "Step 2 of 4");
  assert.equal(progressText(lesson({ started: false })), "4 steps · not started");
  assert.equal(progressText(lesson({ stepCount: 0, started: true })), "Conversation");
  assert.equal(progressPercent(lesson()), 50);
  assert.equal(progressPercent(lesson({ started: false })), 0);
  assert.equal(progressPercent(lesson({ stepCount: 0 })), 0);
});

test("overall stats count only what happened", () => {
  const s = overallStats([lesson(), lesson({ id: "2", started: false, attempts: 0, averageBest: null }), lesson({ id: "3", averageBest: 40, attempts: 1, stepIndex: 3 }), lesson({ id: "4", status: "ARCHIVED", attempts: 9 })]);
  assert.deepEqual(s, { lessons: 2, stepsReached: 2 + 4, checkIns: 3, average: 60 });
  assert.equal(overallStats([]).average, null);
});

test("weak spots: under the cut-off, weakest first, unchecked steps ignored", () => {
  const steps = [
    { stepIndex: 0, best: { score: 3, total: 3 } }, { stepIndex: 1, best: { score: 1, total: 3 } },
    { stepIndex: 2, best: { score: 0, total: 2 } }, { stepIndex: 3, best: { score: 0, total: 0 } }, { stepIndex: 4, best: { score: 3, total: 5 } },
  ];
  assert.deepEqual(weakSteps(steps).map((s) => s.stepIndex), [2, 1]);
  assert.deepEqual(weakSteps(steps, 70).map((s) => s.stepIndex), [2, 1, 4]);
  assert.deepEqual(weakSteps([]), []);
  assert.equal(percentOf({ score: 2, total: 3 }), 67);
  assert.equal(percentOf({ score: 0, total: 0 }), null);
});

test("nudge: the most recent lesson that is under way", () => {
  const list = [lesson({ id: "old", lastStudiedAt: "2026-11-01T00:00:00Z" }), lesson({ id: "new", lastStudiedAt: "2026-11-18T00:00:00Z" }), lesson({ id: "end", stepIndex: 3, lastStudiedAt: "2026-11-19T00:00:00Z" }), lesson({ id: "arch", status: "ARCHIVED", lastStudiedAt: "2026-11-19T00:00:00Z" })];
  assert.equal(nudgeFor(list).id, "new");
  assert.equal(nudgeFor([lesson({ started: false })]), null);
  assert.equal(nudgeFor([]), null);
});

test("time ago", () => {
  const now = Date.parse("2026-11-19T12:00:00Z");
  assert.equal(timeAgo("2026-11-19T11:59:30Z", now), "just now");
  assert.equal(timeAgo("2026-11-19T11:30:00Z", now), "30 minutes ago");
  assert.equal(timeAgo("2026-11-19T11:00:00Z", now), "1 hour ago");
  assert.equal(timeAgo("2026-11-19T07:00:00Z", now), "5 hours ago");
  assert.equal(timeAgo("2026-11-18T09:00:00Z", now), "yesterday");
  assert.equal(timeAgo("2026-11-14T12:00:00Z", now), "5 days ago");
  assert.equal(timeAgo("2026-08-19T12:00:00Z", now), "3 months ago");
  assert.equal(timeAgo("nope", now), "");
});

test("csv: header, rows, quoting and formula safety", () => {
  const csv = progressToCsv([lesson({ title: 'He said "hi", ok' }), lesson({ id: "2", title: "=HYPERLINK(\"x\")", started: false, averageBest: null, attempts: 0, checkedSteps: 0 }), lesson({ id: "3", status: "ARCHIVED", title: "@sum" })]);
  const lines = csv.trimEnd().split("\r\n");
  assert.equal(lines[0], "Lesson,Topic,Status,Step reached,Steps,Checked steps,Check-in attempts,Average best score (%),Last studied");
  assert.equal(lines[1], '"He said ""hi"", ok",Calculus,In progress,2,4,1,2,80,2026-11-18T10:00:00.000Z');
  assert.ok(lines[2].startsWith('"\'=HYPERLINK(""x"")"'));
  assert.match(lines[2], /Not started,,4,0,0,,/);
  assert.ok(lines[3].startsWith("'@sum,Calculus,Archived"));
  assert.ok(csv.endsWith("\r\n"));
});
