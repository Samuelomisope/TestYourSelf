import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import ChartBlock from "./ChartBlock";
import DiagramBlock from "./DiagramBlock";
import Md from "./Markdown";
import { clampZoom, drawableBlocks, pinchZoom, stepZoom, ZOOM_MAX, ZOOM_MIN, zoomLabel } from "./boardHelpers";

const zoomButton = "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-ink/10 px-2 text-xs font-semibold transition hover:bg-ink/5 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-violet-500";
const distance = (pointers) => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };

function Block({ block }) {
  switch (block.kind) {
    case "TEXT":
      return <p className="text-[0.95rem] leading-relaxed text-ink/85">{block.text}</p>;
    case "LIST": {
      const List = block.ordered ? "ol" : "ul";
      return <List className={`${block.ordered ? "list-decimal" : "list-disc"} space-y-1 pl-6 text-[0.95rem] text-ink/85`}>{block.items.map((item, i) => <li key={i}>{item}</li>)}</List>;
    }
    case "FORMULA":
      return (
        <figure className="overflow-x-auto rounded-xl bg-ink/[0.04] px-3 py-1">
          <Md>{block.markdown}</Md>
          {block.caption && <figcaption className="pb-2 text-center text-xs text-ink/55">{block.caption}</figcaption>}
        </figure>
      );
    case "TABLE":
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            {block.caption && <caption className="pb-1 text-left text-xs text-ink/55">{block.caption}</caption>}
            <thead><tr>{block.headers.map((header, i) => <th key={i} scope="col" className="border border-ink/15 bg-ink/5 px-2 py-1 text-left font-semibold">{header}</th>)}</tr></thead>
            <tbody>{block.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c} className="border border-ink/15 px-2 py-1">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case "DIAGRAM":
      return block.diagram ? <DiagramBlock alt={block.alt} diagram={block.diagram} /> : <TextAlternative block={block} />;
    case "CHART":
      return block.chart ? <ChartBlock alt={block.alt} chart={block.chart} /> : <TextAlternative block={block} />;
    default:
      return null;
  }
}

// A diagram or chart whose data could not be drawn still tells the student what it was meant to show.
function TextAlternative({ block }) {
  return (
    <figure className="rounded-xl border border-dashed border-ink/25 p-3 text-sm text-ink/75">
      <figcaption className="text-xs font-bold uppercase tracking-wider text-ink/45">{block.kind === "CHART" ? "Chart" : "Diagram"}</figcaption>
      <p className="mt-1">{block.alt}</p>
    </figure>
  );
}

/**
 * The whiteboard for one page of the lesson. Zoom works with the buttons, the + / - / 0 keys, Ctrl+wheel (a trackpad
 * pinch) and a two-finger pinch on touch; panning is ordinary scrolling, so arrow keys and touch drags work too.
 */
export default function BoardPanel({ page }) {
  const [zoom, setZoom] = useState(1);
  const canvas = useRef(null);
  const pointers = useRef(new Map());
  const pinch = useRef(null);
  const blocks = drawableBlocks(page);

  useEffect(() => {
    // Not a React prop: a wheel handler can only stop the browser zooming the whole page if it is not passive.
    const el = canvas.current;
    if (!el) return undefined;
    const onWheel = (event) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      setZoom((value) => clampZoom(value * (event.deltaY < 0 ? 1.08 : 1 / 1.08)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onKeyDown = (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "+" || event.key === "=") { event.preventDefault(); setZoom((value) => stepZoom(value, 1)); }
    else if (event.key === "-" || event.key === "_") { event.preventDefault(); setZoom((value) => stepZoom(value, -1)); }
    else if (event.key === "0") { event.preventDefault(); setZoom(1); }
  };
  const onPointerDown = (event) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) pinch.current = { start: distance(pointers.current), zoom };
  };
  const onPointerMove = (event) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2 && pinch.current) setZoom(pinchZoom(pinch.current.zoom, pinch.current.start, distance(pointers.current)));
  };
  const onPointerEnd = (event) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  return (
    <section className="rounded-2xl border border-ink/10 bg-bg-elevated shadow-sm" aria-labelledby="board-title">
      <header className="flex items-center gap-2 border-b border-ink/10 px-4 py-2.5">
        <h2 id="board-title" className="min-w-0 flex-1 truncate text-sm font-bold">Whiteboard{page.title ? `: ${page.title}` : ""}</h2>
        <div role="group" aria-label="Zoom" className="flex items-center gap-1">
          <button type="button" className={zoomButton} onClick={() => setZoom((value) => stepZoom(value, -1))} disabled={zoom <= ZOOM_MIN} aria-label="Zoom out"><Minus aria-hidden="true" className="h-4 w-4" /></button>
          <button type="button" className={zoomButton} onClick={() => setZoom(1)} aria-label={`Zoom ${zoomLabel(zoom)}, reset to 100%`}>{zoomLabel(zoom)}</button>
          <button type="button" className={zoomButton} onClick={() => setZoom((value) => stepZoom(value, 1))} disabled={zoom >= ZOOM_MAX} aria-label="Zoom in"><Plus aria-hidden="true" className="h-4 w-4" /></button>
        </div>
      </header>
      <p id="board-help" className="sr-only">Use plus and minus to zoom, zero to reset, and the arrow keys to scroll.</p>
      <div
        ref={canvas}
        role="region"
        aria-label="Board contents"
        aria-describedby="board-help"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={{ touchAction: "pan-x pan-y" }}
        className="max-h-[50vh] min-h-[9rem] overflow-auto p-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-violet-500"
      >
        {/* CSS zoom re-flows the content, so text stays sharp and wraps at the new size. */}
        <div style={{ zoom }} className="space-y-4">
          {blocks.length ? blocks.map((block, i) => <Block key={block.key ?? i} block={block} />) : <p className="text-sm text-ink/55">Nothing is on the board for this step yet.</p>}
        </div>
      </div>
    </section>
  );
}
