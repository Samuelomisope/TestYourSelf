import test from "node:test";
import assert from "node:assert/strict";
import { barPercent, coverageNote, premiumShare, rankFeatures } from "./usageView.js";

const rows = [
  { key: "a", label: "Alpha", visitors: 5, visits: 9, users: 20, actions: 30 },
  { key: "b", label: "Beta", visitors: 50, visits: 60, users: 2, actions: 3 },
  { key: "c", label: "Carl", visitors: 5, visits: 20, users: 20, actions: 10 },
  { key: "d", label: "Dune", visitors: 0, visits: 0, users: 0, actions: 0 },
];

test("ranks by people who opened a section, then by visits, then by name", () => {
  assert.deepEqual(rankFeatures(rows, "opened").map((r) => r.key), ["b", "c", "a", "d"]);
});

test("ranks by people who used it when asked", () => {
  assert.deepEqual(rankFeatures(rows, "used").map((r) => r.key), ["a", "c", "b", "d"]);
});

test("does not change the input and tolerates bad input", () => {
  const copy = JSON.stringify(rows);
  rankFeatures(rows);
  assert.equal(JSON.stringify(rows), copy);
  assert.deepEqual(rankFeatures(undefined), []);
  assert.deepEqual(rankFeatures([null, { label: "no key" }, { key: "x", label: "X", visitors: "7" }]).map((r) => r.key), ["x"]);
});

test("barPercent scales to the top row and keeps small values visible", () => {
  assert.equal(barPercent(50, 50), 100);
  assert.equal(barPercent(25, 50), 50);
  assert.equal(barPercent(1, 1000), 3);
  assert.equal(barPercent(0, 50), 0);
  assert.equal(barPercent(5, 0), 0);
  assert.equal(barPercent("x", 5), 0);
});

test("premiumShare is a rounded percent, or null for an empty section", () => {
  assert.equal(premiumShare(1, 3), 33);
  assert.equal(premiumShare(0, 10), 0);
  assert.equal(premiumShare(0, 0), null);
  assert.equal(premiumShare(undefined, undefined), null);
});

test("coverageNote warns when visit data covers less than the window", () => {
  const today = new Date("2026-11-27T10:00:00Z");
  assert.match(coverageNote({ days: 30, visitsTrackedSince: null }, today), /not been counted yet/);
  assert.match(coverageNote({ days: 30, visitsTrackedSince: "2026-11-25" }, today), /only 3 days \(since 2026-11-25\)/);
  assert.match(coverageNote({ days: 7, visitsTrackedSince: "2026-11-27" }, today), /only 1 day \(/);
  assert.equal(coverageNote({ days: 7, visitsTrackedSince: "2026-10-01" }, today), "Visits have been counted since 2026-10-01.");
});
