import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { eventSpeech, latexToSpeech, speakable, splitSentences } from "./speakable.js";

describe("latexToSpeech", () => {
  it("reads common formulas as words", () => {
    assert.equal(latexToSpeech("x^2"), "x squared");
    assert.equal(latexToSpeech("x^3"), "x cubed");
    assert.equal(latexToSpeech("x^{n+1}"), "x to the power n plus 1");
    assert.equal(latexToSpeech("a_i"), "a sub i");
    assert.equal(latexToSpeech("\\frac{a}{b}"), "a over b");
    assert.equal(latexToSpeech("\\sqrt{x+1}"), "the square root of x plus 1");
    assert.equal(latexToSpeech("a^2+b^2=c^2"), "a squared plus b squared equals c squared");
    assert.equal(latexToSpeech("x \\to \\infty"), "x approaches infinity");
    assert.equal(latexToSpeech("\\pi r^2"), "pi r squared");
  });

  it("reads a nested fraction and \\text content", () => {
    assert.equal(latexToSpeech("\\frac{1}{\\sqrt{2}}"), "1 over the square root of 2");
    assert.equal(latexToSpeech("v = \\text{speed}"), "v equals speed");
  });

  it("falls back instead of guessing for unknown commands, broken input and long formulas", () => {
    const fallback = "the formula shown on the board";
    for (const bad of ["x^{\\frac{a}}", "\\unknowncmd{x}", "\\frac{a}", "x^", "a".repeat(200), "", "  ", null, undefined, "\\"]) assert.equal(latexToSpeech(bad), fallback);
  });
});

describe("speakable", () => {
  it("removes Markdown formatting", () => {
    assert.equal(speakable("## Limits\n\n**Key idea:** a *limit* is a `target`."), "Limits Key idea: a limit is a target.");
    assert.equal(speakable("- one\n- two\n1. three"), "one two three");
    assert.equal(speakable("See [the notes](https://x.test/a) now."), "See the notes now.");
    assert.equal(speakable("> quoted line"), "quoted line");
  });

  it("drops citation markers, code blocks, images, HTML and emoji", () => {
    assert.equal(speakable("Limits approach a value [1] and [2, 3]."), "Limits approach a value and.");
    assert.equal(speakable("Before\n```js\nconst x = 1;\n```\nAfter"), "Before After");
    assert.equal(speakable("Look ![diagram](a.png) here"), "Look here");
    assert.equal(speakable("a <b>bold</b> word"), "a bold word");
    assert.equal(speakable("Great job 🎉"), "Great job");
  });

  it("speaks inline and display maths", () => {
    assert.equal(speakable("Since $x^2$ grows fast"), "Since x squared grows fast");
    assert.equal(speakable("Then:\n$$\n\\frac{a}{b}\n$$\nholds."), "Then: a over b holds.");
    assert.equal(speakable("It is \\(a_1\\) here"), "It is a sub 1 here");
  });

  it("says symbols and percentages in words", () => {
    assert.equal(speakable("a 50% chance"), "a 50 percent chance");
    assert.equal(speakable("x ≤ y"), "x is less than or equal to y");
    assert.equal(speakable("Tom & Jerry"), "Tom and Jerry");
  });

  it("does not turn a price or two dollar signs into maths", () => {
    assert.equal(speakable("It costs $5 and $10 today"), "It costs 5 and 10 today");
  });

  it("never leaves markup punctuation to be read aloud", () => {
    assert.doesNotMatch(speakable("a * b _ c \\ d | e ~ f"), /[*_\\|~]/);
  });

  it("returns an empty string for nothing speakable or the wrong type", () => {
    for (const bad of ["", "   ", "***", "[1]", "```x```", null, undefined, 5, {}, "🎉"]) assert.equal(speakable(bad), "");
  });
});

describe("eventSpeech", () => {
  it("speaks SAY and CHECK, and nothing else", () => {
    assert.equal(eventSpeech({ type: "SAY", text: "Hello **there**" }), "Hello there");
    assert.equal(eventSpeech({ type: "CHECK", question: "What is $x^2$?" }), "What is x squared?");
    for (const silent of [{ type: "BOARD_PAGE", title: "t" }, { type: "BOARD_BLOCK", block: {} }, { type: "STEP_START" }, { type: "NEW" }, null, undefined, "x"]) assert.equal(eventSpeech(silent), "");
  });
});

describe("splitSentences", () => {
  it("splits at sentence ends and keeps exact slices of the text", () => {
    const text = "First one. Second one! Is this third? Yes.";
    const parts = splitSentences(text);
    assert.deepEqual(parts, ["First one.", "Second one!", "Is this third?", "Yes."]);
    let from = 0;
    for (const part of parts) { const at = text.indexOf(part, from); assert.ok(at >= from); from = at + part.length; }
  });

  it("does not split inside numbers or after common abbreviations", () => {
    assert.deepEqual(splitSentences("Pi is 3.14 roughly. Use e.g. this one."), ["Pi is 3.14 roughly.", "Use e.g. this one."]);
  });

  it("breaks an over-long sentence at commas, then spaces, never beyond the limit", () => {
    const long = `${"alpha beta gamma, ".repeat(30)}end.`;
    const parts = splitSentences(long, 100);
    assert.ok(parts.length > 3);
    for (const part of parts) assert.ok(part.length <= 100, part);
    assert.equal(parts.join(" ").replace(/\s+/g, " "), long.replace(/\s+/g, " "));
  });

  it("cuts a single enormous word rather than looping forever", () => {
    const parts = splitSentences("x".repeat(450), 100);
    assert.deepEqual(parts.map((p) => p.length), [100, 100, 100, 100, 50]);
  });

  it("copes with empty and non-string input", () => {
    for (const bad of ["", "   ", null, undefined]) assert.deepEqual(splitSentences(bad), []);
  });
});
