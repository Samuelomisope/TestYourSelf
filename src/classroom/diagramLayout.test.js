import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assignLayers, layoutDiagram, NODE_W, wrapLabel } from "./diagramLayout.js";

const n = (...ids) => ids.map((id) => ({ id, label: `Node ${id}` }));
const e = (...pairs) => pairs.map(([from, to, label = ""]) => ({ from, to, label }));
const layers = (nodes, edges) => Object.fromEntries(assignLayers(nodes, edges).layer);

const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const noOverlaps = (nodes) => nodes.every((a, i) => nodes.slice(i + 1).every((b) => !overlap(a, b)));
const inside = (layout) => layout.nodes.every((x) => x.x >= 0 && x.y >= 0 && x.x + x.w <= layout.width && x.y + x.h <= layout.height);
const onBorder = (node, p) => {
  const eps = 0.6;
  const withinX = p.x >= node.x - eps && p.x <= node.x + node.w + eps;
  const withinY = p.y >= node.y - eps && p.y <= node.y + node.h + eps;
  const onX = Math.abs(p.x - node.x) < eps || Math.abs(p.x - node.x - node.w) < eps;
  const onY = Math.abs(p.y - node.y) < eps || Math.abs(p.y - node.y - node.h) < eps;
  return (onX && withinY) || (onY && withinX);
};

// The tests below place diagrams exactly as asked; the automatic switch to top-to-bottom has its own tests.
const lay = (spec) => layoutDiagram(spec, { maxWidth: Infinity });

describe("wrapLabel", () => {
  it("keeps short labels on one line and wraps at word boundaries", () => {
    assert.deepEqual(wrapLabel("Start"), ["Start"]);
    assert.deepEqual(wrapLabel("Heat flows from hot to cold bodies"), ["Heat flows from hot", "to cold bodies"]);
  });
  it("splits a word longer than a line, and ends with an ellipsis past three lines", () => {
    assert.deepEqual(wrapLabel("a".repeat(45)), ["a".repeat(20), "a".repeat(20), "a".repeat(5)]);
    const long = wrapLabel("word ".repeat(40));
    assert.equal(long.length, 3);
    assert.ok(long[2].endsWith("…"));
    assert.ok(long.every((line) => line.length <= 20));
  });
  it("copes with empty and non-text input", () => {
    for (const v of ["", "   ", null, undefined]) assert.deepEqual(wrapLabel(v), [""]);
  });
});

describe("assignLayers", () => {
  it("layers a chain, a diamond and unconnected nodes", () => {
    assert.deepEqual(layers(n("a", "b", "c"), e(["a", "b"], ["b", "c"])), { a: 0, b: 1, c: 2 });
    assert.deepEqual(layers(n("a", "b", "c", "d"), e(["a", "b"], ["a", "c"], ["b", "d"], ["c", "d"])), { a: 0, b: 1, c: 1, d: 2 });
    assert.deepEqual(layers(n("a", "b", "c"), []), { a: 0, b: 0, c: 0 });
  });
  it("puts a node after its deepest parent", () => {
    assert.equal(layers(n("a", "b", "c"), e(["a", "b"], ["b", "c"], ["a", "c"])).c, 2);
  });
  it("waits for the deepest parent even when a shallower parent is met later", () => {
    // y is listed first, so a naive pass would let y (layer 0) overwrite the longer chain a > b > c into d.
    const l = layers(n("y", "a", "b", "c", "d"), e(["y", "d"], ["a", "b"], ["b", "c"], ["c", "d"]));
    assert.deepEqual(l, { y: 0, a: 0, b: 1, c: 2, d: 3 });
  });

  it("sets aside the edge that closes a loop instead of failing", () => {
    const { layer, back } = assignLayers(n("a", "b", "c"), e(["a", "b"], ["b", "c"], ["c", "a"]));
    assert.deepEqual(Object.fromEntries(layer), { a: 0, b: 1, c: 2 });
    assert.deepEqual([...back], ["c>a"]);
  });
  it("ignores self loops, unknown nodes and duplicates", () => {
    assert.deepEqual(layers(n("a", "b"), e(["a", "a"], ["a", "zzz"], ["zzz", "b"], ["a", "b"], ["a", "b"])), { a: 0, b: 1 });
  });
});

describe("layoutDiagram", () => {
  const flow = { direction: "LR", nodes: n("a", "b", "c", "d"), edges: e(["a", "b", "then"], ["a", "c"], ["b", "d"], ["c", "d"]) };

  it("reads left to right, one column per layer", () => {
    const l = lay(flow);
    const x = Object.fromEntries(l.nodes.map((node) => [node.id, node.x]));
    assert.ok(x.a < x.b && x.b < x.d);
    assert.equal(x.b, x.c);
    assert.equal(x.b - x.a, NODE_W + 84);
  });

  it("reads top to bottom, one row per layer, when asked", () => {
    const l = lay({ ...flow, direction: "TB" });
    const y = Object.fromEntries(l.nodes.map((node) => [node.id, node.y]));
    assert.ok(y.a < y.b && y.b < y.d);
    assert.equal(l.direction, "TB");
  });

  it("never overlaps nodes or leaves them outside the canvas, in either direction", () => {
    for (const direction of ["LR", "TB"]) {
      const l = lay({ ...flow, direction });
      assert.ok(noOverlaps(l.nodes), direction);
      assert.ok(inside(l), direction);
    }
  });

  it("holds up for a dense, cyclic ten-node graph", () => {
    const nodes = n("a", "b", "c", "d", "e", "f", "g", "h", "i", "j");
    const edges = e(["a", "b"], ["a", "c"], ["a", "d"], ["b", "e"], ["c", "e"], ["d", "f"], ["e", "g"], ["f", "g"], ["g", "h"], ["h", "i"], ["i", "j"], ["j", "a"], ["e", "b"], ["c", "j"]);
    for (const direction of ["LR", "TB"]) {
      const l = lay({ direction, nodes, edges });
      assert.ok(noOverlaps(l.nodes), direction);
      assert.ok(inside(l), direction);
      assert.ok(Number.isFinite(l.width) && Number.isFinite(l.height) && l.width > 0 && l.height > 0);
      assert.equal(l.edges.length, edges.length);
    }
  });

  it("starts and ends each edge on the border of its nodes", () => {
    const l = lay({ ...flow, edges: [...flow.edges, ...e(["d", "a"], ["a", "d"])] });
    const byId = Object.fromEntries(l.nodes.map((node) => [node.id, node]));
    for (const edge of l.edges) {
      assert.ok(onBorder(byId[edge.from], edge.p1), `${edge.from}>${edge.to} start`);
      assert.ok(onBorder(byId[edge.to], edge.p2), `${edge.from}>${edge.to} end`);
    }
  });

  it("draws edges in opposite directions apart, and keeps only one of a duplicate", () => {
    const l = lay({ nodes: n("a", "b"), edges: e(["a", "b"], ["b", "a"], ["a", "b"]) });
    assert.equal(l.edges.length, 2);
    assert.notEqual(l.edges[0].d, l.edges[1].d);
  });

  it("drops self loops and edges to nodes that are not there", () => {
    const l = lay({ nodes: n("a", "b"), edges: e(["a", "a"], ["a", "q"], ["a", "b"]) });
    assert.deepEqual(l.edges.map((x) => `${x.from}>${x.to}`), ["a>b"]);
  });

  it("makes taller boxes for long labels and shortens long edge labels", () => {
    const l = lay({ nodes: [{ id: "a", label: "Short" }, { id: "b", label: "A rather long description that needs several lines" }], edges: e(["a", "b", "x".repeat(60)]) });
    assert.ok(l.nodes[1].h > l.nodes[0].h);
    assert.ok(l.edges[0].text.length <= 24 && l.edges[0].text.endsWith("…"));
    assert.equal(l.edges[0].label.length, 60);
  });

  it("keeps edge labels inside the canvas", () => {
    const l = lay({ direction: "LR", nodes: n("a", "b", "c"), edges: e(["a", "b", "first"], ["b", "c", "second"], ["c", "a", "loops back"], ["a", "c", "skips"]) });
    for (const edge of l.edges.filter((x) => x.text)) {
      assert.ok(edge.labelX - edge.labelW / 2 >= 0 && edge.labelX + edge.labelW / 2 <= l.width, edge.text);
      assert.ok(edge.labelY - 10 >= 0 && edge.labelY + 10 <= l.height, edge.text);
    }
  });
});

describe("layoutDiagram readability", () => {
  const chain = (count, direction) => ({ direction, nodes: n(...["a", "b", "c", "d", "e", "f"].slice(0, count)), edges: e(...["a", "b", "c", "d", "e", "f"].slice(0, count - 1).map((id, i) => [id, ["a", "b", "c", "d", "e", "f"][i + 1]])) });

  it("flips a wide left-to-right diagram to top-to-bottom, and leaves a narrow or explicit one alone", () => {
    assert.equal(layoutDiagram(chain(5, "LR")).direction, "TB");
    assert.equal(layoutDiagram(chain(2, "LR")).direction, "LR");
    assert.equal(layoutDiagram(chain(5, "TB")).direction, "TB");
    assert.equal(layoutDiagram(chain(5, "LR"), { maxWidth: Infinity }).direction, "LR");
    assert.ok(layoutDiagram(chain(5, "LR")).width <= 560);
  });

  it("keeps the wider layout when top-to-bottom would not be narrower", () => {
    const star = { direction: "LR", nodes: n("a", "b", "c", "d", "e", "f"), edges: e(["a", "b"], ["a", "c"], ["a", "d"], ["a", "e"], ["a", "f"]) };
    const l = layoutDiagram(star, { maxWidth: 100 });
    assert.ok(l.width > 100);
    assert.equal(l.direction, "LR"); // a column of five is narrower than a row of five, so LR is already the narrow one
  });

  it("leaves room between columns for a long edge label", () => {
    const l = lay({ direction: "LR", nodes: n("a", "b"), edges: e(["a", "b", "an unusually long edge label that is cut"]) });
    const [a, b] = l.nodes;
    const edge = l.edges[0];
    assert.ok(edge.labelX - edge.labelW / 2 >= a.x + a.w, "label starts after node a");
    assert.ok(edge.labelX + edge.labelW / 2 <= b.x, "label ends before node b");
  });

  it("swings an edge that skips layers clear of the nodes in between", () => {
    const nodes = n("a", "b", "c", "d");
    const edges = e(["a", "b"], ["b", "c"], ["c", "d"], ["a", "d", "skip"], ["d", "a", "back"]);
    for (const direction of ["LR", "TB"]) {
      const l = lay({ direction, nodes, edges });
      for (const edge of l.edges.filter((x) => x.label === "skip" || x.label === "back")) {
        const between = l.nodes.filter((node) => node.id !== "a" && node.id !== "d");
        assert.ok(between.every((node) => edge.labelX < node.x || edge.labelX > node.x + node.w || edge.labelY < node.y || edge.labelY > node.y + node.h), `${direction} ${edge.label}`);
      }
      assert.ok(inside(l) && l.edges.every((x) => x.labelX - x.labelW / 2 >= 0 && x.labelX + x.labelW / 2 <= l.width), direction);
    }
  });
});
