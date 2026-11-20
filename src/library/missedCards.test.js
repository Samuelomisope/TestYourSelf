import test from "node:test";
import assert from "node:assert/strict";
import { missedDeckTitle, missedToCards } from "./missedCards.js";

const qs = [
  { question: "Q1?", options: ["a", "b"], answer: "a" },
  { question: "Q2?", options: ["c", "d"], answer: "d", explanation: "Because d." },
  { question: "Q3?", options: ["e", "f"], answer: "f" },
];

test("only wrong, answered questions become cards", () => {
  const cards = missedToCards(qs, { 0: "a", 1: "c" });
  assert.deepEqual(cards, [{ front: "Q2?", back: "d\n\nBecause d." }]);
});

test("unanswered questions and malformed rows are skipped", () => {
  assert.deepEqual(missedToCards(qs, {}), []);
  assert.deepEqual(missedToCards([{ question: "", answer: "x" }, { question: "Q", answer: "" }, null], { 0: "z", 1: "z", 2: "z" }), []);
  assert.deepEqual(missedToCards(undefined, undefined), []);
});

test("long text is clipped", () => {
  const [c] = missedToCards([{ question: "q".repeat(900), answer: "a".repeat(900), explanation: "e".repeat(900) }], { 0: "x" });
  assert.equal(c.front.length, 500);
  assert.ok(c.back.length <= 300 + 2 + 400);
});

test("deck title", () => {
  assert.equal(missedDeckTitle("Thermo notes"), "Missed questions: Thermo notes");
  assert.equal(missedDeckTitle(""), "Missed questions: Quiz");
  assert.equal(missedDeckTitle(undefined), "Missed questions: Quiz");
});
