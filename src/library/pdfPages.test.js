import test from "node:test";
import assert from "node:assert/strict";
import { canViewInApp, downloadName, fitScale, pagesToRender } from "./pdfPages.js";

test("fitScale fits width, clamps, and survives bad input", () => {
  assert.equal(fitScale(600, 300), 0.5);
  assert.equal(fitScale(600, 900), 1.5);
  assert.equal(fitScale(100, 1000), 3);
  assert.equal(fitScale(600, 100), 0.5);
  assert.equal(fitScale(0, 300), 1);
  assert.equal(fitScale(600, NaN), 1);
});

test("pagesToRender keeps a buffer, stays inside the document", () => {
  assert.deepEqual([...pagesToRender(new Set([1]), 10)].sort((a, b) => a - b), [1, 2]);
  assert.deepEqual([...pagesToRender(new Set([5]), 10)].sort((a, b) => a - b), [4, 5, 6]);
  assert.deepEqual([...pagesToRender(new Set([10]), 10)].sort((a, b) => a - b), [9, 10]);
  assert.equal(pagesToRender(new Set(), 10).size, 0);
});

test("canViewInApp only for PDFs", () => {
  assert.ok(canViewInApp("application/pdf"));
  assert.ok(canViewInApp("PDF"));
  assert.ok(!canViewInApp("application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
  assert.ok(!canViewInApp(undefined));
});

test("downloadName is safe and adds .pdf once", () => {
  assert.equal(downloadName("Thermo notes", "application/pdf"), "Thermo notes.pdf");
  assert.equal(downloadName("Thermo.PDF", "pdf"), "Thermo.PDF");
  assert.equal(downloadName('a/b"c', "application/pdf"), "a b c.pdf");
  assert.equal(downloadName("", "video/mp4"), "material");
});
