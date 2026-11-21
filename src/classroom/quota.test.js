import test from "node:test";
import assert from "node:assert/strict";
import { PREMIUM_CLASSROOM_BENEFITS, quotaKind, quotaNotice } from "./quota.js";

test("quotaKind reads the three server messages", () => {
  assert.equal(quotaKind("Daily classroom turn quota reached."), "turns");
  assert.equal(quotaKind("Daily classroom upload quota reached."), "upload");
  assert.equal(quotaKind("Classroom document quota reached."), "documents");
});

test("quotaKind ignores everything else", () => {
  assert.equal(quotaKind("You're going a little fast."), null);
  assert.equal(quotaKind(""), null);
  assert.equal(quotaKind(undefined), null);
  assert.equal(quotaKind(42), null);
});

test("free accounts get the upsell, premium accounts do not", () => {
  for (const kind of ["turns", "upload", "documents"]) {
    assert.equal(quotaNotice(kind, false).upsell, true);
    const p = quotaNotice(kind, true);
    assert.equal(p.upsell, false);
    assert.ok(!/premium/i.test(p.body), p.body);
    assert.ok(!/free/i.test(p.body), p.body);
  }
  assert.equal(quotaNotice("nope", false), null);
});

test("the turns notice tells the person what still works and that it resets", () => {
  const n = quotaNotice("turns", false);
  assert.match(n.body, /come back with the new day/);
  assert.match(n.body, /keep reading/);
});

test("benefit list is not empty and has no prices or limits quoted", () => {
  assert.ok(PREMIUM_CLASSROOM_BENEFITS.length >= 3);
  for (const b of PREMIUM_CLASSROOM_BENEFITS) assert.ok(!/₦|naira|\d+\s*(turns|mb|gb|documents|%)/i.test(b), b);
});
