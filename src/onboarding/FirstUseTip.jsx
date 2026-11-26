import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { featureForPath } from "./logic.js";
import { useOnboarding } from "./context";

// A small pointer under the menu tab of the newest unseen feature. It goes away when the person opens the feature
// or taps "Got it", and never shows while the tour or What's new is open.
export default function FirstUseTip() {
  const { unseen, markSeen, tourOpen, whatsNewOpen } = useOnboarding();
  const { pathname } = useLocation();
  const [rect, setRect] = useState(null);
  const feature = unseen.find((f) => f.navId && !featureForPath(pathname, [f]));
  const hidden = !feature || tourOpen || whatsNewOpen;

  useEffect(() => {
    if (hidden) return undefined;
    const measure = () => {
      const el = document.querySelector(`[data-tour="tab-${feature.navId}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const t = setTimeout(measure, 600);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
  }, [hidden, feature?.navId, pathname]);

  if (hidden || !rect) return null; // a stale rect is ignored while hidden
  const w = Math.min(260, window.innerWidth - 24);
  const left = Math.max(12, Math.min(rect.left + rect.width / 2 - w / 2, window.innerWidth - w - 12));
  const top = rect.top + rect.height + 10;
  const arrow = Math.max(14, Math.min(rect.left + rect.width / 2 - left - 6, w - 26));

  return (
    <div role="status" style={{ top, left, width: w }} className="fixed z-30 rounded-xl border border-violet-400/40 bg-bg-elevated p-3 shadow-xl">
      <span aria-hidden="true" style={{ left: arrow }} className="absolute -top-1.5 h-3 w-3 rotate-45 border-l border-t border-violet-400/40 bg-bg-elevated" />
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-violet-400">New</p>
      <p className="mb-2 text-sm font-semibold text-ink">{feature.label}</p>
      <p className="mb-3 text-xs leading-relaxed text-ink/60">{feature.description.split(".")[0]}.</p>
      <button onClick={() => markSeen(feature.key)} className="min-h-9 rounded-lg bg-violet-500 px-3 text-xs font-medium text-white hover:bg-violet-400">Got it</button>
    </div>
  );
}
