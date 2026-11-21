import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FEATURES } from "./registry.js";
import { useOnboarding } from "./context";
import { NewBadge } from "./NewBadge";

// Everything in the registry, newest first, with the unseen ones marked.
export default function WhatsNew() {
  const { whatsNewOpen, closeWhatsNew, isNew, markSeen, startTour } = useOnboarding();
  const closeRef = useRef(null);

  useEffect(() => {
    if (!whatsNewOpen) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") closeWhatsNew(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [whatsNewOpen, closeWhatsNew]);

  if (!whatsNewOpen) return null;
  const items = [...FEATURES].sort((a, b) => (a.addedOn < b.addedOn ? 1 : -1));

  return (
    <div className="fixed inset-0 z-[9990] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={closeWhatsNew}>
      <div role="dialog" aria-modal="true" aria-labelledby="whatsnew-title" onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border border-ink/10 bg-bg-elevated p-5 shadow-2xl sm:max-w-md sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="whatsnew-title" className="text-lg font-bold text-ink">What's new</h2>
          <button ref={closeRef} onClick={closeWhatsNew} aria-label="Close what's new" className="h-10 w-10 rounded-xl text-ink/50 hover:bg-white/5 hover:text-ink">✕</button>
        </div>
        <ul className="space-y-3">
          {items.map((f) => (
            <li key={f.key} className="rounded-xl border border-ink/10 p-4">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-ink">{f.label}</h3>
                {isNew(f.key) && <NewBadge />}
              </div>
              <p className="mb-3 text-sm leading-relaxed text-ink/60">{f.description}</p>
              <Link to={f.href} onClick={() => { markSeen(f.key); closeWhatsNew(); }}
                className="inline-flex min-h-10 items-center rounded-lg bg-violet-500 px-4 text-sm font-medium text-white hover:bg-violet-400">
                Try it
              </Link>
            </li>
          ))}
        </ul>
        <button onClick={startTour} className="mt-4 min-h-10 w-full rounded-xl border border-ink/10 text-sm text-ink/60 hover:bg-white/5 hover:text-ink">
          Take the app tour
        </button>
      </div>
    </div>
  );
}
