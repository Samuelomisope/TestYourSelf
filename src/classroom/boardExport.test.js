import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { boardFilename, boardToMarkdown } from "./boardExport.js";

const page = (title, blocks) => ({ title, blocks });

describe("boardToMarkdown", () => {
  it("writes each kind of block", () => {
    const md = boardToMarkdown([page("Limits", [
      { kind: "TEXT", text: "A limit is a target." },
      { kind: "LIST", ordered: true, items: ["one", "two"] },
      { kind: "LIST", items: ["bullet"] },
      { kind: "FORMULA", latex: "x^2", caption: "Square" },
      { kind: "TABLE", headers: ["x", "f(x)"], rows: [["1", "2"]], caption: "Values" },
      { kind: "DIAGRAM", alt: "A flow", nodes: [{ id: "a", label: "Start" }, { id: "b", label: "End" }], edges: [{ from: "a", to: "b", label: "then" }] },
      { kind: "CHART", alt: "Rising", chart: "bar", labels: ["Mon", "Tue"], series: [{ name: "Hours", values: [1, 2] }] },
    ])], { title: "Calculus" });
    assert.equal(md, [
      "# Calculus: whiteboard", "",
      "## Step 1: Limits", "",
      "A limit is a target.", "",
      "1. one\n2. two", "",
      "- bullet", "",
      "$$\nx^2\n$$\n\n*Square*", "",
      "**Values**\n\n| x | f(x) |\n| --- | --- |\n| 1 | 2 |", "",
      "*Diagram: A flow*\n\nConnections:\n- Start → End (then)", "",
      "*Chart: Rising*\n\n|  | Hours |\n| --- | --- |\n| Mon | 1 |\n| Tue | 2 |", "",
    ].join("\n"));
  });

  it("escapes pipes and flattens line breaks in table cells", () => {
    const md = boardToMarkdown([page("T", [{ kind: "TABLE", headers: ["a|b"], rows: [["x|y\nz"]] }])]);
    assert.match(md, /\| a\\\|b \|/);
    assert.match(md, /\| x\\\|y z \|/);
  });

  it("keeps a diagram or chart whose data cannot be drawn as its text alternative", () => {
    const md = boardToMarkdown([page("D", [{ kind: "DIAGRAM", alt: "Only words", nodes: [] }, { kind: "CHART", alt: "Just text" }])]);
    assert.match(md, /\*Diagram: Only words\*/);
    assert.match(md, /\*Chart: Just text\*/);
    assert.doesNotMatch(md, /Connections|\| --- \|/);
  });

  it("numbers pages by position, names untitled ones, and skips empty or unusable ones", () => {
    const md = boardToMarkdown([page("First", [{ kind: "TEXT", text: "a" }]), page("Empty", []), page("", [{ kind: "TEXT", text: "b" }]), page("Bad", [{ kind: "HTML", html: "<b>x</b>" }])]);
    assert.match(md, /## Step 1: First/);
    assert.doesNotMatch(md, /Empty|Bad/);
    assert.match(md, /## Board 3/);
  });

  it("never emits raw markup from a block and returns nothing for an empty board", () => {
    assert.doesNotMatch(boardToMarkdown([page("x", [{ kind: "HTML", html: "<script>1</script>" }, { kind: "TEXT", text: "ok" }])]), /script/);
    for (const bad of [[], null, undefined, "x", [null], [{ blocks: "no" }]]) assert.equal(boardToMarkdown(bad), "");
  });

  it("uses a generic heading without a title", () => {
    assert.match(boardToMarkdown([page("A", [{ kind: "TEXT", text: "a" }])]), /^# Whiteboard\n/);
  });
});

describe("boardFilename", () => {
  it("makes a safe slug", () => {
    assert.equal(boardFilename("Limits & Continuity!"), "limits-continuity-whiteboard.md");
    assert.equal(boardFilename("Café déjà vu"), "cafe-deja-vu-whiteboard.md");
    assert.equal(boardFilename("../../etc/passwd"), "etc-passwd-whiteboard.md");
  });
  it("falls back when nothing usable is left and caps the length", () => {
    for (const bad of ["", "   ", "日本語", null, undefined]) assert.equal(boardFilename(bad), "lesson-whiteboard.md");
    assert.ok(boardFilename("a".repeat(200)).length <= 60 + "-whiteboard.md".length);
  });
});
