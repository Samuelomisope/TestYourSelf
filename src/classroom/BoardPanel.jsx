import { useEffect, useRef, useState } from "react";
import { Download, MessageCircleQuestion, Minus, Plus, Printer } from "lucide-react";
import BoardBlock from "./BoardBlock";
import { clampZoom, drawableBlocks, pinchZoom, stepZoom, ZOOM_MAX, ZOOM_MIN, zoomLabel } from "./boardHelpers";

const zoomButton = "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-ink/10 px-2 text-xs font-semibold transition hover:bg-ink/5 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-violet-500";
const distance = (pointers) => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };

/**
 * The whiteboard for one page of the lesson. Zoom works with the buttons, the + / - / 0 keys, Ctrl+wheel (a trackpad
 * pinch) and a two-finger pinch on touch; panning is ordinary scrolling, so arrow keys and touch drags work too.
 */
export default function BoardPanel({ page, onAsk, onDownload, onPrint }) {
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
        {(onDownload || onPrint) && (
          <div role="group" aria-label="Export whiteboard" className="flex items-center gap-1">
            {onDownload && <button type="button" className={zoomButton} onClick={onDownload} aria-label="Download whiteboard as Markdown" title="Download as Markdown"><Download aria-hidden="true" className="h-4 w-4" /></button>}
            {onPrint && <button type="button" className={zoomButton} onClick={onPrint} aria-label="Print or save whiteboard as PDF" title="Print or save as PDF"><Printer aria-hidden="true" className="h-4 w-4" /></button>}
          </div>
        )}
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
          {blocks.length ? blocks.map((block, i) => (
            <div key={block.key ?? i}>
              <BoardBlock block={block} />
              {onAsk && block.turnId && block.eventId && (
                <button type="button" onClick={() => onAsk(block)} className="mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-500/10 focus-visible:outline-2 focus-visible:outline-violet-500 dark:text-violet-300">
                  <MessageCircleQuestion aria-hidden="true" className="h-3.5 w-3.5" />Ask about this
                </button>
              )}
            </div>
          )) : <p className="text-sm text-ink/55">Nothing is on the board for this step yet.</p>}
        </div>
      </div>
    </section>
  );
}
