import test from "node:test";
import assert from "node:assert/strict";
import { cleanPayments, formatDate, formatMoney, shortReference } from "./receipt.js";

test("formatMoney uses the naira sign and other currencies by code", () => {
  assert.equal(formatMoney(2000, "NGN"), "₦2,000");
  assert.equal(formatMoney(1500.5, "NGN"), "₦1,500.5");
  assert.equal(formatMoney(5, "USD"), "USD 5");
  assert.equal(formatMoney("x"), "");
});

test("formatDate gives a readable Lagos date and tolerates bad input", () => {
  assert.equal(formatDate("2026-11-24T10:00:00.000Z"), "24 November 2026");
  assert.equal(formatDate("nope"), "");
});

test("cleanPayments drops malformed rows and sorts newest first", () => {
  const rows = cleanPayments({ payments: [
    { reference: "a", amount: 2000, currency: "NGN", paidAt: "2026-10-24T10:00:00Z" },
    null,
    { reference: 5, amount: 2000, paidAt: "2026-10-24" },
    { reference: "b", amount: 2000, currency: "NGN", paidAt: "2026-11-24T10:00:00Z" },
    { reference: "c", amount: "abc", paidAt: "2026-11-24" },
  ] });
  assert.deepEqual(rows.map((r) => r.reference), ["b", "a"]);
  assert.deepEqual(cleanPayments(undefined), []);
});

test("shortReference shortens long references only", () => {
  assert.equal(shortReference("unilib_0123456789abcdef0123456789abcdef"), "unilib_0123…cdef");
  assert.equal(shortReference("short"), "short");
});
