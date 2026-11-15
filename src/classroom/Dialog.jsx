import { useEffect, useRef } from "react";

/**
 * Modal built on the native <dialog>, which gives focus trapping, Escape to close and a backdrop for free.
 * Children are only mounted while open, so any form state inside resets each time it opens.
 */
export default function Dialog({ open, onClose, labelledBy, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-ink/10 bg-bg-elevated p-0 text-ink shadow-2xl backdrop:bg-black/50"
    >
      {open ? <div className="p-5">{children}</div> : null}
    </dialog>
  );
}
