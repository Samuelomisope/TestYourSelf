import { useEffect, useRef, useState } from "react";
import { fitScale, pagesToRender } from "./pdfPages.js";

// Shows a PDF inside UniLib, so phones that would otherwise force a download can read it in place. pdf.js is loaded
// only when this component opens. If the file cannot be loaded here, onFallback lets the page offer the old
// "open in a new tab" link instead of a dead end.
export default function PdfViewer({ url, title, onClose, onFallback, onDownload, initialPage = 1, onPage }) {
  const hostRef = useRef(null);
  const docRef = useRef(null);
  const [state, setState] = useState({ status: "loading", total: 0, current: 1 });

  useEffect(() => {
    let cancelled = false;
    let observer = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = worker;
        const doc = await pdfjs.getDocument({ url }).promise;
        if (cancelled) { doc.destroy(); return; }
        docRef.current = doc;
        setState({ status: "ready", total: doc.numPages, current: Math.min(Math.max(1, initialPage), doc.numPages) });
      } catch {
        if (!cancelled) setState({ status: "error", total: 0, current: 1 });
      }
    })();
    return () => { cancelled = true; observer?.disconnect(); docRef.current?.destroy(); docRef.current = null; };
  }, [url]);

  useEffect(() => {
    if (state.status !== "ready") return undefined;
    const host = hostRef.current;
    const doc = docRef.current;
    const slots = new Map([...host.querySelectorAll("[data-page]")].map((el) => [Number(el.dataset.page), el]));
    const visible = new Set();
    const drawn = new Map(); // page -> true once drawn at the current width
    let width = host.clientWidth;

    const draw = async (pageNo) => {
      const slot = slots.get(pageNo);
      if (!slot || drawn.get(pageNo) === width) return;
      drawn.set(pageNo, width);
      const page = await doc.getPage(pageNo);
      const base = page.getViewport({ scale: 1 });
      const scale = fitScale(base.width, width - 16);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: scale * ratio });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width; canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / ratio}px`; canvas.style.height = `${viewport.height / ratio}px`;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      slot.replaceChildren(canvas);
    };
    const sizeSlots = async () => {
      const first = await doc.getPage(1);
      const base = first.getViewport({ scale: 1 });
      const h = base.height * fitScale(base.width, width - 16);
      slots.forEach((el) => { el.style.minHeight = `${h}px`; });
    };

    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const n = Number(e.target.dataset.page);
        if (e.isIntersecting) visible.add(n); else visible.delete(n);
      }
      pagesToRender(visible, state.total).forEach((n) => { void draw(n); });
      if (visible.size) setState((s) => ({ ...s, current: Math.min(...visible) }));
    }, { root: host, rootMargin: "300px 0px" });
    slots.forEach((el) => observer.observe(el));
    void sizeSlots().then(() => {
      // Jump to where the reader stopped last time, once the pages have their height.
      const target = slots.get(Math.min(Math.max(1, initialPage), state.total));
      if (initialPage > 1 && target) target.scrollIntoView({ block: "start" });
    });

    const onResize = () => {
      if (Math.abs(host.clientWidth - width) < 24) return;
      width = host.clientWidth; drawn.clear(); void sizeSlots();
      pagesToRender(visible, state.total).forEach((n) => { void draw(n); });
    };
    window.addEventListener("resize", onResize);
    return () => { observer.disconnect(); window.removeEventListener("resize", onResize); };
  }, [state.status, state.total]);

  useEffect(() => { if (state.status === "ready") onPage?.(state.current); }, [state.status, state.current, onPage]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-bg" role="dialog" aria-modal="true" aria-label={`Reading ${title}`}>
      <div className="flex items-center gap-2 border-b border-ink/10 px-3 py-2">
        <button onClick={onClose} className="min-h-10 rounded-lg px-3 text-sm text-ink/70 hover:bg-white/5">← Back</button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{title}</p>
        {state.status === "ready" && <span className="text-xs text-ink/50" aria-live="polite">Page {state.current} of {state.total}</span>}
        <button onClick={onDownload} className="min-h-10 rounded-lg border border-violet-500/30 px-3 text-sm text-violet-400 hover:bg-violet-500/10">Download</button>
      </div>
      <div ref={hostRef} className="flex-1 overflow-y-auto bg-ink/5 px-2 py-2">
        {state.status === "loading" && <p className="py-16 text-center text-sm text-ink/50">Loading document…</p>}
        {state.status === "error" && (
          <div className="mx-auto max-w-sm py-16 text-center text-sm text-ink/70">
            <p className="mb-3">We couldn't show this file here.</p>
            <button onClick={onFallback} className="min-h-10 rounded-lg bg-violet-500 px-4 font-medium text-white hover:bg-violet-400">Open in a new tab</button>
          </div>
        )}
        {state.status === "ready" && Array.from({ length: state.total }, (_, i) => i + 1).map((n) => (
          <div key={n} data-page={n}
            className="mx-auto mb-2 flex w-fit max-w-full items-start justify-center bg-white shadow" aria-label={`Page ${n}`} />
        ))}
      </div>
    </div>
  );
}
