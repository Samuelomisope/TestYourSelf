import { useState, useEffect, useRef, useCallback } from "react";

// ─── Tour step definitions ────────────────────────────────────────────────────
// Each step targets a DOM element by its `data-tour` attribute.
// tipPos: "right" | "left" | "bottom" | "bottom-left" | "top"
const TOUR_STEPS = [
  {
    target: "sidebar",
    title: "Navigation sidebar",
    desc: "All four modules of TestYourSelf live here — Study Materials, AI Tools, Marketplace, and ChatSnap. Click any to jump right in.",
    tipPos: "right",
  },
  {
    target: "global-search",
    title: "Global search",
    desc: "Search across study materials, users, and marketplace products all at once from here.",
    tipPos: "bottom",
  },
  {
    target: "nav-study",
    title: "Study materials",
    desc: "Upload PDFs and documents for your courses. Share them with other students or keep them private.",
    tipPos: "right",
  },
  {
    target: "nav-ai",
    title: "AI tools",
    desc: "Chat with an AI tutor, summarise your notes, or generate practice questions from your uploaded materials.",
    tipPos: "right",
  },
  {
    target: "nav-market",
    title: "Marketplace",
    desc: "Buy and sell textbooks, past questions, and other academic resources with fellow students.",
    tipPos: "right",
  },
  {
    target: "nav-chat",
    title: "ChatSnap",
    desc: "Real-time encrypted messaging with voice notes and media sharing. Study groups made easy.",
    tipPos: "right",
  },
  {
    target: "user-avatar",
    title: "Your profile",
    desc: "Manage your account, university details, and notification preferences here.",
    tipPos: "bottom-left",
  },
];

const STORAGE_KEY = "testyourself_tour_seen";
const TOOLTIP_WIDTH = 240;
const TOOLTIP_HEIGHT = 170;
const SPOTLIGHT_PAD = 8;

function getSpotlightRect(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top + window.scrollY - SPOTLIGHT_PAD,
    left: r.left + window.scrollX - SPOTLIGHT_PAD,
    width: r.width + SPOTLIGHT_PAD * 2,
    height: r.height + SPOTLIGHT_PAD * 2,
  };
}

function computeTooltipPos(spotRect, tipPos) {
  if (!spotRect) return { top: 80, left: 80 };
  const gap = 14;
  const vw = window.innerWidth;
  const vh = window.innerHeight + window.scrollY;
  let top, left;

  if (tipPos === "right") {
    top = spotRect.top + spotRect.height / 2 - TOOLTIP_HEIGHT / 2;
    left = spotRect.left + spotRect.width + gap;
    if (left + TOOLTIP_WIDTH > vw - 8) left = spotRect.left - TOOLTIP_WIDTH - gap;
  } else if (tipPos === "left") {
    top = spotRect.top + spotRect.height / 2 - TOOLTIP_HEIGHT / 2;
    left = spotRect.left - TOOLTIP_WIDTH - gap;
    if (left < 8) left = spotRect.left + spotRect.width + gap;
  } else if (tipPos === "bottom") {
    top = spotRect.top + spotRect.height + gap;
    left = spotRect.left + spotRect.width / 2 - TOOLTIP_WIDTH / 2;
    if (top + TOOLTIP_HEIGHT > vh - 8) top = spotRect.top - TOOLTIP_HEIGHT - gap;
  } else if (tipPos === "top") {
    top = spotRect.top - TOOLTIP_HEIGHT - gap;
    left = spotRect.left + spotRect.width / 2 - TOOLTIP_WIDTH / 2;
    if (top < 8) top = spotRect.top + spotRect.height + gap;
  } else if (tipPos === "bottom-left") {
    top = spotRect.top + spotRect.height + gap;
    left = spotRect.left + spotRect.width - TOOLTIP_WIDTH;
  }

  left = Math.max(8, Math.min(left, vw - TOOLTIP_WIDTH - 8));
  top = Math.max(8, Math.min(top, vh - TOOLTIP_HEIGHT - 8));
  return { top, left };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AppTour({ autoStart = true, onComplete }) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [spotRect, setSpotRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 80, left: 80 });
  const [done, setDone] = useState(false);
  const resizeRef = useRef(null);

  // Auto-start for first-time visitors
  useEffect(() => {
    if (!autoStart) return;
    if (!localStorage.getItem(STORAGE_KEY)) setActive(true);
  }, [autoStart]);

  const positionStep = useCallback((stepIndex) => {
    const { target, tipPos } = TOUR_STEPS[stepIndex];
    const el = document.querySelector(`[data-tour="${target}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setTimeout(() => {
      const rect = getSpotlightRect(el);
      setSpotRect(rect);
      setTooltipPos(computeTooltipPos(rect, tipPos));
    }, 80);
  }, []);

  useEffect(() => {
    if (active) positionStep(step);
  }, [active, step, positionStep]);

  useEffect(() => {
    if (!active) return;
    const handleResize = () => positionStep(step);
    resizeRef.current = handleResize;
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [active, step, positionStep]);

  // Lock body scroll while tour is open
  useEffect(() => {
    document.body.style.overflow = active ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [active]);

  const handleNext = () =>
    step < TOUR_STEPS.length - 1 ? setStep((s) => s + 1) : setDone(true);

  const handlePrev = () => step > 0 && setStep((s) => s - 1);

  const closeTour = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setActive(false);
    setDone(false);
    setStep(0);
    onComplete?.();
  };

  // Allow manual restart, e.g. from a Help menu button
  useEffect(() => {
    window.__startTour = () => {
      setDone(false);
      setStep(0);
      setActive(true);
    };
  }, []);

  if (!active) return null;

  const currentStep = TOUR_STEPS[step];

  return (
    <div
      className="fixed inset-0 z-[9999]"
      role="dialog"
      aria-modal="true"
      aria-label="App tour"
    >
      {/* ── SVG backdrop with spotlight cutout ── */}
      {spotRect && (
        <svg
          className="fixed inset-0 w-screen h-screen pointer-events-auto"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={spotRect.left}
                y={spotRect.top}
                width={spotRect.width}
                height={spotRect.height}
                rx="10"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.6)"
            mask="url(#spotlight-mask)"
          />
          {/* Spotlight highlight ring */}
          <rect
            x={spotRect.left}
            y={spotRect.top}
            width={spotRect.width}
            height={spotRect.height}
            rx="10"
            fill="none"
            stroke="#AFA9EC"
            strokeWidth="2"
          />
        </svg>
      )}

      {/* ── Skip button ── */}
      {!done && (
        <button
          onClick={() => setDone(true)}
          className="fixed top-4 right-4 z-[10001] px-3 py-1.5 text-sm text-white/80 border border-white/30 rounded-lg bg-transparent hover:border-white/60 hover:text-white transition-colors cursor-pointer"
        >
          Skip tour
        </button>
      )}

      {/* ── Step tooltip ── */}
      {!done && (
        <div
          role="tooltip"
          className="fixed z-[10002] w-60 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-lg"
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
        >
          {/* Step label */}
          <p className="text-xs font-semibold text-violet-500 uppercase tracking-wide mb-1">
            Step {step + 1} of {TOUR_STEPS.length}
          </p>

          {/* Title */}
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
            {currentStep.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
            {currentStep.desc}
          </p>

          {/* Footer: dots + nav buttons */}
          <div className="flex items-center justify-between">
            {/* Progress dots */}
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {TOUR_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`block w-1.5 h-1.5 rounded-full transition-colors ${
                    i === step ? "bg-violet-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                />
              ))}
            </div>

            {/* Nav buttons */}
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer active:scale-95"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-3 py-1 text-xs bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors cursor-pointer active:scale-95"
              >
                {step === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Done / completion card ── */}
      {done && (
        <div
          className="fixed inset-0 z-[10003] flex items-center justify-center pointer-events-auto"
          role="alertdialog"
          aria-label="Tour complete"
        >
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-8 py-8 text-center w-[280px] shadow-xl">
            {/* Check icon */}
            <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-violet-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              You're all set!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
              That's a quick look at TestYourSelf. Start by uploading a study
              material or chatting with the AI tutor.
            </p>
            <button
              onClick={closeTour}
              className="w-full py-2.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer active:scale-95"
            >
              Get started
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
