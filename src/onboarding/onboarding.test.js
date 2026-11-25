import test from "node:test";
import assert from "node:assert/strict";
import { cardPlacement, featureForPath, isFeatureNew, isNewAccount, isValidKey, newFeatures, readLegacyTourSeen, shouldAutoStartTour, stepLabel } from "./logic.js";
import { MARKETPLACE_ENABLED } from "../features.js";
import { FEATURES, TOUR_KEY, TOUR_STEPS } from "./registry.js";

const NOW = new Date("2026-11-20T12:00:00Z").getTime();
const daysAgo = (d) => new Date(NOW - d * 86400000).toISOString();

test("registry: keys are valid and unique, tour has 12 steps (11 while the marketplace is hidden) with unique ids and real targets", () => {
  const keys = FEATURES.map((f) => f.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const k of [...keys, TOUR_KEY]) assert.ok(isValidKey(k), k);
  const steps = MARKETPLACE_ENABLED ? 12 : 11;
  assert.equal(TOUR_STEPS.length, steps);
  assert.equal(new Set(TOUR_STEPS.map((s) => s.id)).size, steps);
  for (const s of TOUR_STEPS) assert.ok(s.target && s.title && s.desc, s.id);
  for (const s of TOUR_STEPS.filter((x) => x.feature)) assert.ok(keys.includes(s.feature));
});

test("isValidKey mirrors the server rule", () => {
  assert.ok(isValidKey("tour:v2"));
  assert.ok(!isValidKey("A"));
  assert.ok(!isValidKey("Tour:v2"));
  assert.ok(!isValidKey("x".repeat(65)));
  assert.ok(!isValidKey(null));
});

test("isNewAccount: inside 7 days only, never on bad or future dates", () => {
  assert.ok(isNewAccount(daysAgo(0.1), NOW));
  assert.ok(isNewAccount(daysAgo(6.9), NOW));
  assert.ok(!isNewAccount(daysAgo(7), NOW));
  assert.ok(!isNewAccount(daysAgo(30), NOW));
  assert.ok(!isNewAccount(undefined, NOW));
  assert.ok(!isNewAccount("nonsense", NOW));
  assert.ok(!isNewAccount(daysAgo(-1), NOW));
});

test("shouldAutoStartTour: needs ready, young account, no tour:v2, no legacy flag", () => {
  const base = { ready: true, createdAt: daysAgo(1), seen: new Set(), legacySeen: false, now: NOW };
  assert.ok(shouldAutoStartTour(base));
  assert.ok(!shouldAutoStartTour({ ...base, ready: false }));
  assert.ok(!shouldAutoStartTour({ ...base, seen: new Set([TOUR_KEY]) }));
  assert.ok(!shouldAutoStartTour({ ...base, legacySeen: true }));
  assert.ok(!shouldAutoStartTour({ ...base, createdAt: daysAgo(20) }));
});

test("isFeatureNew: unseen and inside its window only", () => {
  const f = { key: "feature:x", addedOn: "2026-11-18", newForDays: 45 };
  assert.ok(isFeatureNew(f, new Set(), NOW));
  assert.ok(!isFeatureNew(f, new Set(["feature:x"]), NOW));
  assert.ok(!isFeatureNew(f, new Set(), new Date("2027-01-10").getTime()));
  assert.ok(!isFeatureNew({ ...f, addedOn: "garbage" }, new Set(), NOW));
});

test("newFeatures: at launch only Classroom is new; seen removes it", () => {
  assert.deepEqual(newFeatures(new Set(), NOW).map((f) => f.key), ["feature:classroom"]);
  assert.deepEqual(newFeatures(new Set(["feature:classroom"]), NOW), []);
});

test("a future feature is one registry entry", () => {
  const features = [...FEATURES, { key: "feature:next", addedOn: "2026-11-19", newForDays: 30, href: "/next" }];
  assert.equal(newFeatures(new Set(["feature:classroom"]), NOW, features).length, 1);
});

test("featureForPath matches the page and its sub-pages, not look-alikes", () => {
  assert.equal(featureForPath("/classroom")?.key, "feature:classroom");
  assert.equal(featureForPath("/classroom/abc")?.key, "feature:classroom");
  assert.equal(featureForPath("/classroom/learning")?.key, "feature:classroom");
  assert.equal(featureForPath("/classroomx"), null);
  assert.equal(featureForPath("/home"), null);
});

test("readLegacyTourSeen reads the old key and survives blocked storage", () => {
  assert.equal(readLegacyTourSeen({ getItem: () => "true" }), true);
  assert.equal(readLegacyTourSeen({ getItem: () => null }), false);
  assert.equal(readLegacyTourSeen({ getItem: () => { throw new Error("blocked"); } }), false);
  assert.equal(readLegacyTourSeen(undefined), false);
});

test("cardPlacement: phone sheet at bottom, flips to top for low targets", () => {
  assert.equal(cardPlacement({ top: 60, left: 10, width: 50, height: 40 }, 360, 800).mode, "bottom");
  assert.equal(cardPlacement({ top: 700, left: 10, width: 200, height: 40 }, 360, 800).mode, "top");
  assert.equal(cardPlacement(null, 360, 800).mode, "center");
});

test("cardPlacement: desktop card stays inside the viewport", () => {
  for (const rect of [{ top: 10, left: 10, width: 60, height: 40 }, { top: 700, left: 1100, width: 60, height: 40 }, { top: 300, left: 400, width: 100, height: 40 }]) {
    const p = cardPlacement(rect, 1200, 800);
    assert.equal(p.mode, "float");
    assert.ok(p.left >= 12 && p.left + p.width <= 1200 - 12, JSON.stringify(p));
    assert.ok(p.top >= 12 && p.top + 220 <= 800 - 12, JSON.stringify(p));
  }
});

test("stepLabel", () => assert.equal(stepLabel(0, 12), "Step 1 of 12"));
