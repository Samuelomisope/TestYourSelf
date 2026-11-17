import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampZoom, drawableBlocks, formulaMarkdown, normalizeBlock, pinchZoom, stepZoom, zoomLabel } from "./boardHelpers.js";

describe("zoom", () => {
  it("clamps to the supported range and recovers from bad numbers", () => {
    assert.equal(clampZoom(0.1), 0.5);
    assert.equal(clampZoom(9), 2);
    assert.equal(clampZoom(1.234567), 1.23);
    for (const bad of [NaN, Infinity, undefined, null, "2"]) assert.equal(clampZoom(bad), 1);
  });

  it("steps through the levels and stops at both ends", () => {
    assert.equal(stepZoom(1, 1), 1.25);
    assert.equal(stepZoom(1, -1), 0.75);
    assert.equal(stepZoom(2, 1), 2);
    assert.equal(stepZoom(0.5, -1), 0.5);
  });

  it("steps from an in-between zoom (after a pinch) to the neighbouring level", () => {
    assert.equal(stepZoom(1.12, 1), 1.25); // nearest level is 1.0, so one step up
    assert.equal(stepZoom(1.12, -1), 0.75);
    assert.equal(stepZoom(NaN, 1), 1.25);
  });

  it("scales by how far the fingers have moved, within limits", () => {
    assert.equal(pinchZoom(1, 100, 150), 1.5);
    assert.equal(pinchZoom(1, 100, 50), 0.5);
    assert.equal(pinchZoom(1.5, 100, 400), 2);
    assert.equal(pinchZoom(1, 0, 100), 1);
    assert.equal(pinchZoom(1.25, 100, NaN), 1.25);
  });

  it("labels the zoom as a percentage", () => {
    assert.equal(zoomLabel(1), "100%");
    assert.equal(zoomLabel(0.75), "75%");
  });
});

describe("formulaMarkdown", () => {
  it("wraps a formula as display math and removes dollar signs", () => {
    assert.equal(formulaMarkdown("x^2"), "$$\nx^2\n$$");
    assert.equal(formulaMarkdown("$$x+1$$"), "$$\nx+1\n$$");
    assert.equal(formulaMarkdown("a$\n$$\n# heading"), "$$\na\n\n# heading\n$$");
  });

  it("returns nothing for empty, oversized or non-text input", () => {
    for (const bad of ["", "   ", "$$", "a".repeat(401), null, undefined, 5, {}]) assert.equal(formulaMarkdown(bad), "");
  });
});

describe("normalizeBlock", () => {
  it("keeps valid blocks and their keys", () => {
    assert.deepEqual(normalizeBlock({ key: "k", kind: "TEXT", text: "hi" }), { kind: "TEXT", key: "k", text: "hi" });
    assert.deepEqual(normalizeBlock({ key: "k", kind: "LIST", ordered: true, items: ["a", "b"] }), { kind: "LIST", key: "k", ordered: true, items: ["a", "b"] });
    assert.deepEqual(normalizeBlock({ kind: "FORMULA", latex: "x", caption: "c" }), { kind: "FORMULA", key: undefined, markdown: "$$\nx\n$$", caption: "c" });
  });

  it("drops anything unusable instead of throwing", () => {
    for (const bad of [null, undefined, "x", 5, [], {}, { kind: "HTML", html: "<b>x</b>" }, { kind: "IMAGE", url: "https://x.test/a.png" },
      { kind: "TEXT", text: "  " }, { kind: "TEXT", text: 5 }, { kind: "LIST", items: "nope" }, { kind: "LIST", items: ["", " "] }, { kind: "FORMULA", latex: "" },
      { kind: "TABLE", headers: [], rows: [["1"]] }, { kind: "TABLE", headers: ["a"], rows: [] }, { kind: "TABLE", headers: ["a"], rows: ["x", null] }]) {
      assert.equal(normalizeBlock(bad), null);
    }
  });

  it("caps long lists, text and tables", () => {
    assert.equal(normalizeBlock({ kind: "TEXT", text: "a".repeat(900) }).text.length, 600);
    assert.equal(normalizeBlock({ kind: "LIST", items: Array(30).fill("x") }).items.length, 12);
    const table = normalizeBlock({ kind: "TABLE", headers: Array(12).fill("h"), rows: Array(30).fill(Array(12).fill("c")) });
    assert.equal(table.headers.length, 8);
    assert.equal(table.rows.length, 12);
    assert.equal(table.rows[0].length, 8);
  });

  it("pads ragged table rows and skips empty ones", () => {
    const table = normalizeBlock({ kind: "TABLE", headers: ["a", "b"], rows: [["1"], [], ["", ""], ["2", "3", "4"]], caption: "T" });
    assert.deepEqual(table.rows, [["1", ""], ["2", "3"]]);
    assert.equal(table.caption, "T");
  });

  it("shows a diagram or chart only with a text alternative", () => {
    assert.deepEqual(normalizeBlock({ kind: "DIAGRAM", alt: "A leads to B", nodes: [] }), { kind: "DIAGRAM", key: undefined, alt: "A leads to B" });
    assert.deepEqual(normalizeBlock({ kind: "CHART", alt: "Rising line" }), { kind: "CHART", key: undefined, alt: "Rising line" });
    assert.equal(normalizeBlock({ kind: "DIAGRAM", nodes: [] }), null);
    assert.equal(normalizeBlock({ kind: "CHART", alt: "  " }), null);
  });
});

describe("drawableBlocks", () => {
  it("filters a page's blocks and copes with a missing page", () => {
    assert.deepEqual(drawableBlocks({ blocks: [{ kind: "TEXT", text: "a" }, { kind: "NOPE" }, null] }).map((b) => b.kind), ["TEXT"]);
    for (const bad of [null, undefined, {}, { blocks: "x" }]) assert.deepEqual(drawableBlocks(bad), []);
  });
});
