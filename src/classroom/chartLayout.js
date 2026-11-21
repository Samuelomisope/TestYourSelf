// Scales and geometry for whiteboard charts (Phase D4). The tutor supplies labels and numbers; the axes, ticks and
// bar or point positions are computed here and tested, so a chart cannot be drawn outside its frame.

/** Series styles that do not rely on colour alone: each series gets its own colour, line dash and marker shape. */
export const SERIES_STYLES = [
  { color: "#7c3aed", dash: "", marker: "circle" },
  { color: "#0f766e", dash: "7 4", marker: "square" },
  { color: "#c2410c", dash: "2 3", marker: "triangle" },
];

/** A readable axis range around [min, max] with evenly spaced round-number ticks. */
export function niceScale(min, max, target = 5) {
  let lo = Math.min(min, max);
  let hi = Math.max(min, max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) { lo = 0; hi = 1; }
  if (lo === hi) { const pad = lo === 0 ? 1 : Math.abs(lo) * 0.1; lo -= pad; hi += pad; }
  const raw = (hi - lo) / Math.max(target - 1, 1);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normal = raw / magnitude;
  const step = (normal <= 1 ? 1 : normal <= 2 ? 2 : normal <= 5 ? 5 : 10) * magnitude;
  const start = Math.floor(lo / step + 1e-9) * step;
  const end = Math.ceil(hi / step - 1e-9) * step;
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const count = Math.round((end - start) / step);
  const ticks = Array.from({ length: count + 1 }, (_, i) => Number((start + i * step).toFixed(decimals)));
  return { min: ticks[0], max: ticks[ticks.length - 1], ticks };
}

/** A short tick label: thousands separators, or a compact form for very large numbers. */
export function formatTick(value) {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value) >= 1e5) return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  return Number.isInteger(value) ? value.toLocaleString("en-US") : String(parseFloat(value.toPrecision(4)));
}

const shorten = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/**
 * Geometry for a "line" or "bar" chart in a width x height frame. `chart` is { chart, labels, series, xLabel?, yLabel? }.
 * Bar charts always include zero so the bars' lengths are honest; line charts fit the data.
 */
export function layoutChart(chart, width = 440, height = 280) {
  const { labels, series } = chart;
  const kind = chart.chart === "bar" ? "bar" : "line";
  const values = series.flatMap((s) => s.values);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (kind === "bar") { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  const scale = niceScale(lo, hi);
  const tickText = scale.ticks.map(formatTick);

  const left = Math.max(...tickText.map((t) => t.length)) * 7 + 20 + (chart.yLabel ? 16 : 0);
  const n = labels.length;
  const band = (width - left - 14) / n;
  // Labels that cannot fit side by side are tilted instead of being run into one another.
  const fit = Math.floor((band - 4) / 6.4);
  const rotated = fit < 6;
  const bottom = 34 + (rotated ? 24 : 0) + (chart.xLabel ? 18 : 0);
  const plot = { x: left, y: 14, w: width - left - 14, h: height - 14 - bottom };
  const y = (v) => plot.y + plot.h - ((v - scale.min) / (scale.max - scale.min)) * plot.h;
  const centres = labels.map((_, i) => plot.x + band * (i + 0.5));

  let marks;
  if (kind === "line") {
    marks = series.map((s, si) => {
      const points = s.values.map((value, i) => ({ x: centres[i], y: y(value), value, label: labels[i] }));
      return { name: s.name, style: SERIES_STYLES[si % SERIES_STYLES.length], points, path: points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("") };
    });
  } else {
    const inner = band * 0.72;
    const barWidth = inner / series.length;
    const base = y(0);
    marks = series.map((s, si) => ({
      name: s.name,
      style: SERIES_STYLES[si % SERIES_STYLES.length],
      bars: s.values.map((value, i) => {
        const top = y(value);
        return { x: plot.x + band * i + (band - inner) / 2 + si * barWidth, y: Math.min(top, base), w: barWidth, h: Math.abs(top - base), value, label: labels[i] };
      }),
    }));
  }

  return {
    kind, width, height, plot, marks, rotated,
    baselineY: y(Math.min(Math.max(0, scale.min), scale.max)),
    yTicks: scale.ticks.map((value, i) => ({ value, text: tickText[i], y: y(value) })),
    xTicks: labels.map((label, i) => ({ text: shorten(label, rotated ? 10 : Math.min(12, fit)), full: label, x: centres[i] })),
  };
}
