import { useEffect, useRef } from "react";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Makes an existing overlay behave like a proper dialog: focus moves in, Tab stays inside,
 * Escape closes, background scroll is locked, and focus returns to what opened it.
 * Attach the returned ref to the overlay element and give it role="dialog" aria-modal="true" aria-label.
 * Pass `active=false` for modals that are conditionally rendered inside a larger component.
 */
export function useModal(onClose, active = true) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    if (!active) return undefined;
    const previous = document.activeElement;
    const root = ref.current;
    const items = () => [...(root?.querySelectorAll(FOCUSABLE) || [])].filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (root && !root.contains(document.activeElement)) (items()[0] || root).focus?.({ preventScroll: true });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); closeRef.current?.(); return; }
      if (e.key !== "Tab" || !root) return;
      const f = items();
      if (!f.length) { e.preventDefault(); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (previous && document.contains(previous)) previous.focus?.({ preventScroll: true });
    };
  }, [active]);

  return ref;
}
