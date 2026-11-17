// Pure helpers for the whiteboard (Phase D3). Stored lessons are untrusted: the server already sanitises blocks, and
// this re-checks them so a damaged or hand-edited record can never break the board or put markup on it.

export const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const ZOOM_MIN = ZOOM_LEVELS[0];
export const ZOOM_MAX = ZOOM_LEVELS[ZOOM_LEVELS.length - 1];

export const clampZoom = (value) => (Number.isFinite(value) ? Math.round(Math.min(Math.max(value, ZOOM_MIN), ZOOM_MAX) * 100) / 100 : 1);
export const zoomLabel = (zoom) => `${Math.round(zoom * 100)}%`;

/** One button step in or out: moves to the neighbouring level of the one nearest the current zoom. */
export function stepZoom(zoom, direction) {
  const current = clampZoom(zoom);
  let nearest = 0;
  ZOOM_LEVELS.forEach((level, i) => { if (Math.abs(level - current) < Math.abs(ZOOM_LEVELS[nearest] - current)) nearest = i; });
  return ZOOM_LEVELS[Math.min(Math.max(nearest + (direction > 0 ? 1 : -1), 0), ZOOM_LEVELS.length - 1)];
}

/** Zoom while two fingers are down: the zoom when they landed, scaled by how far apart they are now. */
export const pinchZoom = (startZoom, startDistance, distance) =>
  startDistance > 0 && Number.isFinite(distance) ? clampZoom(startZoom * (distance / startDistance)) : clampZoom(startZoom);

const text = (value, max) => (typeof value === "string" ? value.slice(0, max) : "");
const NODE_ID = /^[A-Za-z0-9_-]{1,20}$/;

/** A drawable diagram (2 to 10 nodes, edges between real nodes), or null. Same limits as the server applies. */
export function normalizeDiagram(block) {
  const seen = new Set();
  const nodes = [];
  for (const node of (Array.isArray(block.nodes) ? block.nodes : []).slice(0, 10)) {
    const id = typeof node?.id === "string" ? node.id : "";
    const label = text(node?.label, 60).trim();
    if (!NODE_ID.test(id) || !label || seen.has(id)) continue;
    seen.add(id);
    nodes.push({ id, label });
  }
  if (nodes.length < 2) return null;
  const edges = [];
  for (const edge of (Array.isArray(block.edges) ? block.edges : []).slice(0, 20)) {
    const from = typeof edge?.from === "string" ? edge.from : "";
    const to = typeof edge?.to === "string" ? edge.to : "";
    if (!seen.has(from) || !seen.has(to) || from === to) continue;
    edges.push({ from, to, label: text(edge?.label, 40).trim() });
  }
  return { direction: block.direction === "TB" ? "TB" : "LR", nodes, edges };
}

/** A drawable line or bar chart, or null. Series that do not match the labels one to one are dropped. */
export function normalizeChart(block) {
  const labels = (Array.isArray(block.labels) ? block.labels : []).slice(0, 12).map((label) => text(label, 30).trim());
  if (labels.length < 2 || labels.some((label) => !label)) return null;
  const series = [];
  for (const entry of (Array.isArray(block.series) ? block.series : []).slice(0, 3)) {
    const values = Array.isArray(entry?.values) ? entry.values : [];
    const name = text(entry?.name, 40).trim();
    if (!name || values.length !== labels.length || !values.every((v) => typeof v === "number" && Number.isFinite(v) && Math.abs(v) < 1e9)) continue;
    series.push({ name, values });
  }
  if (!series.length) return null;
  return { chart: block.chart === "bar" ? "bar" : "line", labels, series, xLabel: text(block.xLabel, 40).trim(), yLabel: text(block.yLabel, 40).trim() };
}

/** A formula as display-math Markdown for KaTeX, or "" when it is empty or too long. Dollar signs are removed. */
export function formulaMarkdown(latex) {
  const tex = text(latex, 1000).replace(/\$/g, "").trim();
  return tex && tex.length <= 400 ? `$$\n${tex}\n$$` : "";
}

/**
 * The block as the board draws it, or null when there is nothing safe to draw. A diagram or chart without a text
 * alternative is dropped, because a picture that a screen reader cannot describe is not on the board.
 */
export function normalizeBlock(block) {
  if (!block || typeof block !== "object") return null;
  const key = typeof block.key === "string" ? block.key : undefined;
  switch (block.kind) {
    case "TEXT": {
      const body = text(block.text, 600);
      return body.trim() ? { kind: "TEXT", key, text: body } : null;
    }
    case "LIST": {
      const items = (Array.isArray(block.items) ? block.items : []).slice(0, 12).map((item) => text(item, 300)).filter((item) => item.trim());
      return items.length ? { kind: "LIST", key, ordered: block.ordered === true, items } : null;
    }
    case "FORMULA": {
      const markdown = formulaMarkdown(block.latex);
      return markdown ? { kind: "FORMULA", key, markdown, caption: text(block.caption, 160) } : null;
    }
    case "TABLE": {
      const headers = (Array.isArray(block.headers) ? block.headers : []).slice(0, 8).map((header) => text(header, 60));
      if (!headers.length || !headers.some((header) => header.trim())) return null;
      const rows = (Array.isArray(block.rows) ? block.rows : []).slice(0, 12)
        .filter(Array.isArray)
        .map((row) => headers.map((_, i) => text(row[i], 120)))
        .filter((row) => row.some((cell) => cell.trim()));
      return rows.length ? { kind: "TABLE", key, headers, rows, caption: text(block.caption, 160) } : null;
    }
    case "DIAGRAM":
    case "CHART": {
      const alt = text(block.alt, 400);
      if (!alt.trim()) return null;
      // A broken spec is not fatal: the block still shows its text alternative, as in D3.
      return block.kind === "DIAGRAM" ? { kind: "DIAGRAM", key, alt, diagram: normalizeDiagram(block) } : { kind: "CHART", key, alt, chart: normalizeChart(block) };
    }
    default:
      return null;
  }
}

/** The blocks of one page that can be drawn, in order. */
export const drawableBlocks = (page) => (Array.isArray(page?.blocks) ? page.blocks.map(normalizeBlock).filter(Boolean) : []);
