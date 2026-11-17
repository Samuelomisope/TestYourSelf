import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatTick, layoutChart, niceScale, SERIES_STYLES } from "./chartLayout.js";

describe("niceScale", () => {
  it("covers the data with evenly spaced round ticks", () => {
    for (const [lo, hi] of [[0, 10], [0, 97], [-5, 5], [0.1, 0.7], [123, 987], [-1e6, 3e6], [0.002, 0.009]]) {
      const s = niceScale(lo, hi);
      assert.ok(s.min <= lo && s.max >= hi, `${lo}..${hi}`);
      assert.ok(s.ticks.length >= 2 && s.ticks.length <= 11, `${lo}..${hi}`);
      const gaps = s.ticks.slice(1).map((t, i) => Math.round((t - s.ticks[i]) * 1e9) / 1e9);
      assert.ok(gaps.every((g) => g === gaps[0] && g > 0), `${lo}..${hi}`);
      assert.equal(s.min, s.ticks[0]);
      assert.equal(s.max, s.ticks[s.ticks.length - 1]);
    }
    assert.deepEqual(niceScale(0, 10).ticks, [0, 5, 10]);
    assert.deepEqual(niceScale(0.1, 0.7).ticks, [0, 0.2, 0.4, 0.6, 0.8]);
  });
  it("widens a flat range and survives bad numbers", () => {
    const flat = niceScale(3, 3);
    assert.ok(flat.min < 3 && flat.max > 3);
    assert.ok(niceScale(0, 0).min < 0 && niceScale(0, 0).max > 0);
    for (const bad of [NaN, Infinity, undefined]) assert.deepEqual(niceScale(bad, bad).ticks.length >= 2, true);
  });
});

describe("formatTick", () => {
  it("formats whole numbers, decimals and very large numbers", () => {
    assert.equal(formatTick(1000), "1,000");
    assert.equal(formatTick(0.5), "0.5");
    assert.equal(formatTick(-2), "-2");
    assert.equal(formatTick(1234567), "1.2M");
    assert.equal(formatTick(NaN), "");
  });
});

describe("layoutChart", () => {
  const line = { chart: "line", labels: ["a", "b", "c", "d"], series: [{ name: "x", values: [10, 20, 15, 40] }] };
  const bar = { chart: "bar", labels: ["a", "b", "c"], series: [{ name: "x", values: [2, 4, 6] }, { name: "y", values: [1, 3, 5] }] };
  const within = (g, x, y) => x >= g.plot.x - 0.01 && x <= g.plot.x + g.plot.w + 0.01 && y >= g.plot.y - 0.01 && y <= g.plot.y + g.plot.h + 0.01;

  it("places line points inside the plot, in label order, higher values higher up", () => {
    const g = layoutChart(line);
    const pts = g.marks[0].points;
    assert.ok(pts.every((p) => within(g, p.x, p.y)));
    assert.ok(pts.every((p, i) => i === 0 || p.x > pts[i - 1].x));
    assert.ok(pts[3].y < pts[0].y); // 40 is above 10
    assert.ok(g.marks[0].path.startsWith("M"));
    assert.equal(g.kind, "line");
  });

  it("keeps bars inside the plot, in groups that do not overlap, with lengths in proportion", () => {
    const g = layoutChart(bar);
    const all = g.marks.flatMap((m) => m.bars);
    assert.ok(all.every((b) => within(g, b.x, b.y) && within(g, b.x + b.w, b.y + b.h)));
    const [x, y] = g.marks;
    assert.ok(x.bars[0].x + x.bars[0].w <= y.bars[0].x + 0.01); // side by side within a group
    assert.ok(Math.abs(x.bars[2].h / x.bars[0].h - 3) < 0.01); // 6 is three times 2
  });

  it("always includes zero for bars, even when every value is large", () => {
    const g = layoutChart({ chart: "bar", labels: ["a", "b"], series: [{ name: "x", values: [90, 100] }] });
    assert.equal(g.yTicks[0].value, 0);
    assert.ok(Math.abs(g.baselineY - (g.plot.y + g.plot.h)) < 0.01); // baseline is the bottom edge
    assert.ok(g.marks[0].bars.every((b) => b.y + b.h <= g.plot.y + g.plot.h + 0.01));
  });

  it("hangs negative bars below the baseline", () => {
    const g = layoutChart({ chart: "bar", labels: ["a", "b"], series: [{ name: "x", values: [-4, 6] }] });
    const [neg, pos] = g.marks[0].bars;
    assert.ok(Math.abs(neg.y - g.baselineY) < 0.01); // top of a negative bar is the baseline
    assert.ok(Math.abs(pos.y + pos.h - g.baselineY) < 0.01); // bottom of a positive bar is the baseline
    assert.ok(within(g, neg.x, neg.y + neg.h));
  });

  it("gives each series its own colour, dash and marker, and cycles past three", () => {
    assert.equal(new Set(SERIES_STYLES.map((s) => s.color)).size, 3);
    assert.equal(new Set(SERIES_STYLES.map((s) => s.marker)).size, 3);
    assert.equal(new Set(SERIES_STYLES.map((s) => s.dash)).size, 3);
    const g = layoutChart({ ...line, series: [0, 1, 2].map((i) => ({ name: `s${i}`, values: [1, 2, 3, 4] })) });
    assert.deepEqual(g.marks.map((m) => m.style), SERIES_STYLES);
  });

  it("tilts and shortens crowded x labels but keeps the full text", () => {
    const labels = Array.from({ length: 12 }, (_, i) => `Month number ${i}`);
    const g = layoutChart({ chart: "bar", labels, series: [{ name: "x", values: labels.map((_, i) => i) }] });
    assert.equal(g.rotated, true);
    assert.ok(g.xTicks.every((t) => t.text.length <= 10 && t.full.length > 10));
    assert.ok(g.plot.h < layoutChart(line).plot.h, "tilted labels take room from the plot, not from the frame");
  });

  it("keeps a few short labels flat, and shortens them to fit when they would touch", () => {
    assert.equal(layoutChart(line).rotated, false);
    const seven = layoutChart({ chart: "line", labels: ["January", "February", "March", "April", "May", "June", "July"], series: [{ name: "x", values: [1, 2, 3, 4, 5, 6, 7] }] });
    assert.equal(seven.rotated, false);
    const room = seven.plot.w / 7;
    assert.ok(seven.xTicks.every((t) => t.text.length * 6.4 <= room + 4), "no two flat labels overlap");
  });

  it("copes with a flat series and with a single repeated value", () => {
    const g = layoutChart({ chart: "line", labels: ["a", "b", "c"], series: [{ name: "x", values: [5, 5, 5] }] });
    assert.ok(g.marks[0].points.every((p) => Number.isFinite(p.y) && within(g, p.x, p.y)));
  });

  it("leaves room for axis titles", () => {
    const plain = layoutChart(line);
    const titled = layoutChart({ ...line, xLabel: "Week", yLabel: "Score" });
    assert.ok(titled.plot.x > plain.plot.x && titled.plot.h < plain.plot.h);
  });
});
