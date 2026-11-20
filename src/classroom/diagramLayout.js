// Layout for whiteboard diagrams (Phase D4). The tutor supplies only nodes and edges; positions are worked out here,
// so a diagram can never be drawn off-canvas or over itself because of model output. Everything is pure and tested.

export const NODE_W = 150;
export const LINE_H = 16;
const PAD_Y = 12;
const GAP_LAYER_LR = 84; // space between columns when reading left to right
const GAP_LAYER_TB = 60; // space between rows when reading top to bottom
const GAP_NODE = 28;
const MARGIN = 20;
const WRAP = 20;
const MAX_LINES = 3;
// Edges that skip a layer must swing wide enough to clear the nodes in between (half a node plus a margin, doubled
// because a quadratic curve only reaches half of its control offset). Edges between neighbours need only a small bow.
const BOW_NEAR = 40;
const CLEAR_LR = 120;
const CLEAR_TB = 200;
const PREFERRED_WIDTH = 560;
const EDGE_LABEL_MAX = 24;

/** Breaks a label into at most `maxLines` lines of about `width` characters; the rest becomes an ellipsis. */
export function wrapLabel(label, width = WRAP, maxLines = MAX_LINES) {
  const lines = [];
  let line = "";
  for (let word of String(label ?? "").split(/\s+/).filter(Boolean)) {
    while (word.length > width) { // a very long word is split rather than left to overflow its box
      if (line) { lines.push(line); line = ""; }
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }
    if (!line) line = word;
    else if (line.length + 1 + word.length <= width) line += ` ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, width - 1)}…`;
    return kept;
  }
  return lines.length ? lines : [""];
}

/**
 * Puts every node in a layer: sources first, then each node one layer after the latest node that points at it.
 * Edges that would close a loop are set aside ("back" edges) so cycles cannot stop the layering.
 */
export function assignLayers(nodes, edges) {
  const ids = nodes.map((node) => node.id);
  const known = new Set(ids);
  const adjacent = new Map(ids.map((id) => [id, []]));
  const seen = new Set();
  for (const edge of edges) {
    const key = `${edge.from}>${edge.to}`;
    if (!known.has(edge.from) || !known.has(edge.to) || edge.from === edge.to || seen.has(key)) continue;
    seen.add(key);
    adjacent.get(edge.from).push(edge.to);
  }

  const state = new Map(); // 1 while a node is on the current path, 2 once it is finished
  const back = new Set();
  const finished = [];
  const visit = (id) => {
    state.set(id, 1);
    for (const next of adjacent.get(id)) {
      if (state.get(next) === 1) back.add(`${id}>${next}`);
      else if (!state.get(next)) visit(next);
    }
    state.set(id, 2);
    finished.push(id);
  };
  for (const id of ids) if (!state.get(id)) visit(id);

  const layer = new Map(ids.map((id) => [id, 0]));
  for (const id of [...finished].reverse()) {
    for (const next of adjacent.get(id)) {
      if (!back.has(`${id}>${next}`)) layer.set(next, Math.max(layer.get(next), layer.get(id) + 1));
    }
  }
  return { layer, back };
}

const rectOf = (node) => ({ cx: node.x + node.w / 2, cy: node.y + node.h / 2, hw: node.w / 2, hh: node.h / 2 });

/** The point where a line from the centre of `rect` towards (tx, ty) leaves the rectangle. */
function exitPoint(rect, tx, ty) {
  const dx = tx - rect.cx;
  const dy = ty - rect.cy;
  if (!dx && !dy) return { x: rect.cx, y: rect.cy };
  const t = Math.min(dx ? rect.hw / Math.abs(dx) : Infinity, dy ? rect.hh / Math.abs(dy) : Infinity);
  return { x: rect.cx + dx * t, y: rect.cy + dy * t };
}

const edgeLabelText = (label) => (label.length > EDGE_LABEL_MAX ? `${label.slice(0, EDGE_LABEL_MAX - 1)}…` : label);

/**
 * Positions a diagram. Returns the canvas size, each node's box and text lines, and each edge's SVG path and label
 * spot. `direction` is "LR" (layers are columns) or "TB" (layers are rows).
 */
function place({ nodes, edges }, direction) {
  const tb = direction === "TB";
  const { layer, back } = assignLayers(nodes, edges);

  const unique = [];
  const byKey = new Map();
  for (const edge of edges) {
    const key = `${edge.from}>${edge.to}`;
    if (!layer.has(edge.from) || !layer.has(edge.to) || edge.from === edge.to) continue;
    if (byKey.has(key)) { if (!byKey.get(key).label && edge.label) byKey.get(key).label = edge.label; continue; }
    const kept = { from: edge.from, to: edge.to, label: edge.label || "" };
    byKey.set(key, kept);
    unique.push(kept);
  }

  const layerCount = Math.max(...layer.values()) + 1;
  const columns = Array.from({ length: layerCount }, () => []);
  for (const node of nodes) columns[layer.get(node.id)].push(node.id);

  // One pass of ordering by the average position of what points at each node, to cut down edge crossings.
  const indexIn = new Map();
  columns.forEach((ids) => ids.forEach((id, i) => indexIn.set(id, i)));
  for (let l = 1; l < layerCount; l++) {
    const score = (id) => {
      const from = unique.filter((e) => e.to === id && layer.get(e.from) < l && !back.has(`${e.from}>${e.to}`)).map((e) => indexIn.get(e.from));
      return from.length ? from.reduce((a, b) => a + b, 0) / from.length : indexIn.get(id);
    };
    columns[l] = [...columns[l]].sort((a, b) => score(a) - score(b));
    columns[l].forEach((id, i) => indexIn.set(id, i));
  }

  const box = new Map();
  for (const node of nodes) {
    const lines = wrapLabel(node.label);
    box.set(node.id, { id: node.id, lines, w: NODE_W, h: PAD_Y * 2 + lines.length * LINE_H, x: 0, y: 0 });
  }

  if (!tb) {
    // Columns are spaced to fit the longest edge label between them, so a label never sits on top of a node.
    const labelBetween = (l) => Math.max(0, ...unique
      .filter((ed) => layer.get(ed.from) === l && layer.get(ed.to) === l + 1 && !back.has(`${ed.from}>${ed.to}`))
      .map((ed) => (edgeLabelText(ed.label) ? edgeLabelText(ed.label).length * 6.6 + 10 : 0)));
    const columnX = [0];
    for (let l = 0; l < layerCount - 1; l++) columnX.push(columnX[l] + NODE_W + Math.max(GAP_LAYER_LR, labelBetween(l) + 28));
    const heights = columns.map((ids) => ids.reduce((sum, id) => sum + box.get(id).h, 0) + (ids.length - 1) * GAP_NODE);
    const tallest = Math.max(...heights);
    columns.forEach((ids, l) => {
      let y = (tallest - heights[l]) / 2;
      for (const id of ids) {
        const n = box.get(id);
        n.x = columnX[l];
        n.y = y;
        y += n.h + GAP_NODE;
      }
    });
  } else {
    const widths = columns.map((ids) => ids.length * NODE_W + (ids.length - 1) * GAP_NODE);
    const widest = Math.max(...widths);
    const rowHeights = columns.map((ids) => Math.max(...ids.map((id) => box.get(id).h)));
    let top = 0;
    columns.forEach((ids, l) => {
      let x = (widest - widths[l]) / 2;
      for (const id of ids) {
        const n = box.get(id);
        n.x = x;
        n.y = top + (rowHeights[l] - n.h) / 2;
        x += NODE_W + GAP_NODE;
      }
      top += rowHeights[l] + GAP_LAYER_TB;
    });
  }

  const routed = unique.map((edge) => {
    const a = rectOf(box.get(edge.from));
    const b = rectOf(box.get(edge.to));
    const span = Math.abs(layer.get(edge.to) - layer.get(edge.from));
    const forward = layer.get(edge.to) > layer.get(edge.from) && !back.has(`${edge.from}>${edge.to}`);
    // Edges that skip a layer, run backwards or join two nodes in one layer bow sideways so they stay clear of nodes
    // and of an edge going the other way.
    const bow = forward && span === 1 ? 0 : span > 1 ? (tb ? CLEAR_TB : CLEAR_LR) : BOW_NEAR;
    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;
    const length = Math.hypot(dx, dy) || 1;
    const ctrl = { x: (a.cx + b.cx) / 2 + (-dy / length) * bow, y: (a.cy + b.cy) / 2 + (dx / length) * bow };
    const p1 = exitPoint(a, ctrl.x, ctrl.y);
    const p2 = exitPoint(b, ctrl.x, ctrl.y);
    const text = edgeLabelText(edge.label);
    return { ...edge, text, p1, p2, ctrl, labelX: 0.25 * p1.x + 0.5 * ctrl.x + 0.25 * p2.x, labelY: 0.25 * p1.y + 0.5 * ctrl.y + 0.25 * p2.y, labelW: text ? text.length * 6.6 + 10 : 0 };
  });

  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  const grow = (x, y) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
  for (const n of box.values()) { grow(n.x, n.y); grow(n.x + n.w, n.y + n.h); }
  for (const e of routed) {
    grow(e.p1.x, e.p1.y); grow(e.p2.x, e.p2.y);
    grow(e.labelX - e.labelW / 2, e.labelY - 10); grow(e.labelX + e.labelW / 2, e.labelY + 10);
  }
  const shiftX = MARGIN - minX;
  const shiftY = MARGIN - minY;
  const move = (p) => ({ x: p.x + shiftX, y: p.y + shiftY });
  const num = (v) => Math.round(v * 10) / 10;

  return {
    direction: tb ? "TB" : "LR",
    width: Math.ceil(maxX - minX + 2 * MARGIN),
    height: Math.ceil(maxY - minY + 2 * MARGIN),
    nodes: nodes.map((node) => { const n = box.get(node.id); return { ...n, x: num(n.x + shiftX), y: num(n.y + shiftY) }; }),
    edges: routed.map((e) => {
      const p1 = move(e.p1); const p2 = move(e.p2); const c = move(e.ctrl);
      return { from: e.from, to: e.to, label: e.label, text: e.text, labelW: num(e.labelW), labelX: num(e.labelX + shiftX), labelY: num(e.labelY + shiftY), d: `M${num(p1.x)} ${num(p1.y)} Q${num(c.x)} ${num(c.y)} ${num(p2.x)} ${num(p2.y)}`, p1, p2 };
    }),
  };
}

/**
 * Lays a diagram out. A left-to-right diagram that would be wider than `maxWidth` reads top to bottom instead (when
 * that is narrower), because a wide diagram has to be scrolled sideways and shrinking it would make the text too small.
 */
export function layoutDiagram(spec, { maxWidth = PREFERRED_WIDTH } = {}) {
  const first = place(spec, spec.direction === "TB" ? "TB" : "LR");
  if (first.direction === "LR" && first.width > maxWidth) {
    const stacked = place(spec, "TB");
    if (stacked.width < first.width) return stacked;
  }
  return first;
}
