import { useCallback, useState, useSyncExternalStore } from "react";
import { chooseRenderer } from "./rendererChoice";
import { detectWebGL } from "./webgl";

const hasMedia = typeof window !== "undefined" && typeof window.matchMedia === "function";
function useMedia(query) {
  return useSyncExternalStore(
    (notify) => { if (!hasMedia) return () => {}; const m = window.matchMedia(query); m.addEventListener("change", notify); return () => m.removeEventListener("change", notify); },
    () => (hasMedia ? window.matchMedia(query).matches : false),
    () => false,
  );
}

// Set VITE_TUTOR_3D_FOR_ALL=true to let every account see the 3D tutor (for testing, or before there are premium users).
const FOR_ALL = import.meta.env?.VITE_TUTOR_3D_FOR_ALL === "true";

/** Decides 2D or 3D from the account, the browser and the student's own choice. A 3D failure keeps the 2D tutor for the rest of the visit. */
export default function useRendererChoice({ premium, preference }) {
  const [webgl] = useState(detectWebGL);
  const [failed, setFailed] = useState(false);
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)");
  const smallScreen = useMedia("(max-width: 767px)");
  const saveData = typeof navigator !== "undefined" && navigator.connection?.saveData === true;
  const choice = chooseRenderer({ premium: premium || FOR_ALL, webgl: webgl && !failed, reducedMotion, saveData, smallScreen, preference });
  return { ...choice, fail: useCallback(() => setFailed(true), []) };
}
