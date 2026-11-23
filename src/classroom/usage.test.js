import test from "node:test";
import assert from "node:assert/strict";
import { formatReset, turnsLimitBody, usageLine, usageWarning, validUsage } from "./usage.js";

const usage = (used, limit = 10) => ({ turns: { used, limit, remaining: Math.max(limit - used, 0) }, resetsAt: "2026-11-25T00:00:00.000Z" });

test("reset time is shown in Nigerian time: UTC midnight is 1:00 am", () => {
  assert.equal(formatReset("2026-11-25T00:00:00.000Z"), "1:00 am");
  assert.equal(formatReset("2026-11-25T13:30:00.000Z"), "2:30 pm");
  assert.equal(formatReset("nope"), "");
  assert.equal(formatReset(undefined), "");
});

test("usage line states exact numbers and is empty when unknown", () => {
  assert.equal(usageLine(usage(6)), "6 of 10 tutor turns used today");
  assert.equal(usageLine(null), "");
  assert.equal(usageLine({ turns: { used: "x", limit: 10 } }), "");
  assert.equal(validUsage({ turns: { used: 0, limit: 0 } }), false);
});

test("warning appears only for the last two turns", () => {
  assert.equal(usageWarning(usage(7)), "");
  assert.equal(usageWarning(usage(8)), "2 turns left today");
  assert.equal(usageWarning(usage(9)), "1 turn left today");
  assert.equal(usageWarning(usage(10)), "");
  assert.equal(usageWarning(null), "");
});

test("limit message names the real limit and reset time, and drops 'free' for premium", () => {
  const free = turnsLimitBody(usage(10), false);
  assert.match(free, /all 10 free tutor turns/);
  assert.match(free, /reset at 1:00 am/);
  const premium = turnsLimitBody(usage(50, 50), true);
  assert.match(premium, /all 50 tutor turns/);
  assert.doesNotMatch(premium, /free/);
  assert.equal(turnsLimitBody(null, false), null);
  assert.match(turnsLimitBody({ turns: { used: 10, limit: 10 }, resetsAt: "bad" }, false), /come back with the new day/);
});
