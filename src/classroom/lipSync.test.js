import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMouthCues, driveMouth, frameInterval, shouldDraw, visemeForWord, wordAt } from "./lipSync.js";

describe("wordAt", () => {
  const text = "Limits approach a value.";
  it("finds the word at or around a position", () => {
    assert.equal(wordAt(text, 0), "Limits");
    assert.equal(wordAt(text, 3), "Limits");
    assert.equal(wordAt(text, 7), "approach");
    assert.equal(wordAt(text, 6), "approach"); // a signal on the space means the next word
    assert.equal(wordAt(text, 19), "value.");
  });
  it("copes with bad positions and text", () => {
    for (const bad of [-1, 99, NaN, 1.5, null, undefined]) assert.equal(wordAt(text, bad), "");
    for (const bad of [null, undefined, "", "   "]) assert.equal(wordAt(bad, 0), "");
  });
});

describe("visemeForWord", () => {
  it("uses the first vowel", () => {
    assert.equal(visemeForWord("limit"), "ih");
    assert.equal(visemeForWord("approach"), "aa");
    assert.equal(visemeForWord("set"), "ee");
    assert.equal(visemeForWord("go"), "oh");
    assert.equal(visemeForWord("sun"), "ou");
  });
  it("recognises doubled vowels, ignores punctuation and case", () => {
    assert.equal(visemeForWord("School,"), "ou");
    assert.equal(visemeForWord("see"), "ee");
    assert.equal(visemeForWord("VALUE."), "aa");
  });
  it("has a shape for words with no vowel", () => {
    assert.equal(visemeForWord("rhythm"), "aa");
    assert.equal(visemeForWord("my"), "ih");
    for (const odd of ["42", "", null, undefined, "—"]) assert.equal(visemeForWord(odd), "aa");
  });
});

describe("mouth cues", () => {
  it("opens quickly on a word and closes again", () => {
    const cues = createMouthCues();
    cues.push("oh", 10);
    const early = cues.read(10.025);
    const peak = cues.read(10.05);
    const later = cues.read(10.2);
    assert.equal(early.viseme, "oh");
    assert.ok(early.amount > 0 && early.amount < peak.amount);
    assert.ok(later.amount < peak.amount && later.amount > 0);
    assert.equal(cues.read(10.5).amount, 0);
    assert.equal(cues.read(10.6), null);
  });
  it("reports nothing before any word, after a pause, or from the future, and can be cleared", () => {
    const cues = createMouthCues();
    assert.equal(cues.read(1), null);
    cues.push("aa", 5);
    assert.equal(cues.read(4), null);
    assert.equal(cues.read(6), null);
    assert.equal(cues.read(NaN), null);
    cues.clear();
    assert.equal(cues.read(5.05), null);
    cues.push("aa", NaN);
    assert.equal(cues.read(1), null);
  });
});

describe("driveMouth", () => {
  it("is shut when not talking, follows words when they arrive, and uses the rhythm otherwise", () => {
    const cues = createMouthCues();
    assert.deepEqual(driveMouth(cues, 1, false, 0.9), { viseme: "aa", amount: 0 });
    assert.deepEqual(driveMouth(cues, 1, true, 0.4), { viseme: "aa", amount: 0.4 });
    cues.push("ee", 2);
    assert.equal(driveMouth(cues, 2.05, true, 0.4).viseme, "ee");
    assert.deepEqual(driveMouth(cues, 3, true, 0.4), { viseme: "aa", amount: 0.4 });
  });
  it("keeps the rhythm within range", () => {
    const cues = createMouthCues();
    assert.equal(driveMouth(cues, 1, true, 5).amount, 1);
    assert.equal(driveMouth(cues, 1, true, -5).amount, 0);
    assert.equal(driveMouth(cues, 1, true, NaN).amount, 0);
  });
});

describe("frame limiting", () => {
  it("turns a frame rate into a delay within sane limits", () => {
    assert.equal(frameInterval(30), 1000 / 30);
    assert.equal(frameInterval(1000), 1000 / 60);
    assert.equal(frameInterval(1), 100);
    assert.equal(frameInterval(NaN), 1000 / 30);
  });
  it("draws only when the page is visible and the tutor is on screen", () => {
    assert.equal(shouldDraw({}), true);
    assert.equal(shouldDraw({ hidden: true }), false);
    assert.equal(shouldDraw({ onScreen: false }), false);
    assert.equal(shouldDraw(), true);
  });
});
