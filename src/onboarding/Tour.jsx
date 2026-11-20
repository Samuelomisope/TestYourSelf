import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cardPlacement, stepLabel } from "./logic.js";
import { TOUR_STEPS } from "./registry.js";
import { NewBadge } from "./NewBadge";
import { setMenuOpenEvent, useOnboarding } from "./context";

const PAD = 6;
const CARD_H = 230;

const find = (target) => document.querySelector(`[data-tour="${target}"]`);

export default function Tour() {
  const { tourOpen } = useOnboarding();
  return tourOpen ? <TourRun /> : null; // fresh state (step 1) on every open
}

function TourRun() {
  const { tourOpen, closeTour, isNew } = useOnboarding();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [found, setFound] = useState({ id: null, rect: null });
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const cardRef = useRef(null);
  const step = TOUR_STEPS[index];
  const total = TOUR_STEPS.length;

  const measure = useCallback(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });
    const el = find(step.target);
    const r = el?.getBoundingClientRect();
    const usable = r && (r.width > 0 || r.height > 0);
    setFound({ id: step.id, rect: usable ? { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 } : null });
  }, [step.target, step.id]);

  // A measurement from the previous step is never shown for this one.
  const rect = found.id === step.id ? found.rect : null;

  // Open or close the side menu for this step, wait for its slide animation, then point at the real item.
  useEffect(() => {
    if (!tourOpen) return undefined;
    setMenuOpenEvent(!!step.menu);
    const t = setTimeout(() => {
      find(step.target)?.scrollIntoView({ block: "center" });
      measure();
    }, step.menu ? 380 : 60);
    return () => clearTimeout(t);
  }, [tourOpen, index, step.menu, step.target, measure]);

  useEffect(() => {
    if (!tourOpen) return undefined;
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [tourOpen, measure]);

  useEffect(() => {
    document.body.style.overflow = tourOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [tourOpen]);

  const finish = useCallback(() => { setMenuOpenEvent(false); closeTour(); }, [closeTour]);
  const next = useCallback(() => (index < total - 1 ? setIndex((i) => i + 1) : finish()), [index, total, finish]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!tourOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tourOpen, finish, next, prev]);

  useLayoutEffect(() => { if (tourOpen) cardRef.current?.focus(); }, [tourOpen, index]);

  const place = cardPlacement(rect, vp.w, vp.h, CARD_H);
  const cardStyle =
    place.mode === "float" ? { top: place.top, left: place.left, width: place.width }
    : place.mode === "top" ? { top: 12, left: 12, right: 12 }
    : place.mode === "bottom" ? { bottom: 12, left: 12, right: 12 }
    : { top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: Math.min(340, vp.w - 24) };
  const isLast = index === total - 1;

  const goThere = () => { setMenuOpenEvent(false); closeTour(); navigate(step.href); };

  return (
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-label="UniLib app tour">
      {/* Blocks clicks on the page behind. The dim comes from the spotlight's own shadow. */}
      <div className="absolute inset-0" style={rect ? undefined : { background: "rgba(0,0,0,0.75)" }} />
      {rect && (
        <div aria-hidden="true" className="pointer-events-none fixed rounded-xl border-2 border-violet-400 transition-all duration-200"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxShadow: "0 0 0 9999px rgba(0,0,0,0.75)" }} />
      )}

      <div ref={cardRef} tabIndex={-1} style={cardStyle}
        className="fixed rounded-2xl border border-ink/10 bg-bg-elevated p-4 shadow-2xl outline-none">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-400" aria-live="polite">{stepLabel(index, total)}</p>
          <button onClick={finish} className="min-h-9 rounded-lg px-2 text-xs text-ink/50 hover:text-ink">Skip tour</button>
        </div>
        <div className="mb-1.5 flex items-center gap-2">
          <h3 className="text-base font-semibold text-ink">{step.title}</h3>
          {step.feature && isNew(step.feature) && <NewBadge />}
        </div>
        <p className="mb-3 text-sm leading-relaxed text-ink/60">{step.desc}</p>
        {step.href && (
          <button onClick={goThere} className="mb-3 min-h-9 text-sm font-medium text-violet-400 underline-offset-2 hover:underline">
            Open {step.title} now (ends the tour) →
          </button>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="hidden items-center gap-1 sm:flex" aria-hidden="true">
            {TOUR_STEPS.map((s, i) => <span key={s.id} className={`block h-1.5 w-1.5 rounded-full ${i === index ? "bg-violet-400" : "bg-ink/20"}`} />)}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {index > 0 && <button onClick={prev} className="min-h-10 rounded-lg border border-ink/10 px-4 text-sm text-ink/70 hover:bg-white/5">Previous</button>}
            <button onClick={next} className="min-h-10 rounded-lg bg-violet-500 px-5 text-sm font-medium text-white hover:bg-violet-400">{isLast ? "Finish" : "Next"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
