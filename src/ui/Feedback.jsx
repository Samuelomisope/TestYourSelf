import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { FeedbackContext, registerToast } from "./feedbackContext.js";

/**
 * In-app replacements for window.alert / window.confirm.
 *   const toast = useToast();   toast.success("Saved"); toast.error("Couldn't save");
 *   const confirm = useConfirm(); if (await confirm({ title, message, confirmLabel, danger })) { … }
 */
export default function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [ask, setAsk] = useState(null);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((kind, message) => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-2), { id, kind, message: String(message || "") }]);
    setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3500);
  }, [dismiss]);

  const api = useMemo(() => ({
    toast: { success: (m) => push("success", m), error: (m) => push("error", m), info: (m) => push("info", m) },
    confirm: (opts) => new Promise((resolve) => setAsk({ ...opts, resolve })),
  }), [push]);

  useEffect(() => { registerToast(api.toast); return () => registerToast(null); }, [api]);

  const answer = (value) => { ask?.resolve(value); setAsk(null); };

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-bg-elevated px-4 py-3 text-sm text-ink shadow-lg">
            {t.kind === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
              : t.kind === "error" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
              : <Info className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden="true" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="-m-1 grid h-8 w-8 place-items-center rounded-lg text-muted hover:text-ink"><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        ))}
      </div>
      {ask && <ConfirmDialog {...ask} onAnswer={answer} />}
    </FeedbackContext.Provider>
  );
}

function ConfirmDialog({ title = "Are you sure?", message, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false, onAnswer }) {
  const cancelRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onAnswer(false); return; }
      if (e.key !== "Tab") return;
      const f = boxRef.current?.querySelectorAll("button");
      if (!f?.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("keydown", onKey, true); previous?.focus?.(); };
  }, [onAnswer]);

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-4 sm:items-center" onMouseDown={(e) => { if (e.target === e.currentTarget) onAnswer(false); }}>
      <div ref={boxRef} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-msg" className="w-full max-w-sm rounded-2xl border border-line bg-bg-elevated p-5 text-ink shadow-xl">
        <h2 id="confirm-title" className="text-base font-semibold">{title}</h2>
        {message && <p id="confirm-msg" className="mt-2 text-sm text-muted">{message}</p>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} onClick={() => onAnswer(false)} className="min-h-11 rounded-xl border border-line px-4 text-sm font-medium hover:bg-surface">{cancelLabel}</button>
          <button onClick={() => onAnswer(true)} className={`min-h-11 rounded-xl px-4 text-sm font-semibold text-white ${danger ? "bg-red-600 hover:bg-red-500" : "bg-violet-600 hover:bg-violet-500"}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

