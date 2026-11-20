import { useState } from "react";
import { REPORT_REASONS } from "./libraryLinks.js";

// "Report a problem" for a material that is not yours. send(reason, note) rejects on failure.
export default function ReportForm({ send }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("BROKEN_FILE");
  const [note, setNote] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error

  if (state === "sent") return <p role="status" className="mt-3 text-center text-xs text-emerald-400">Thanks. We'll take a look.</p>;
  if (!open) return <button onClick={() => setOpen(true)} className="mt-3 block w-full min-h-10 text-center text-xs text-ink/40 hover:text-ink/70">Report a problem with this file</button>;

  const submit = async (e) => {
    e.preventDefault();
    setState("sending");
    try { await send(reason, note.trim()); setState("sent"); } catch { setState("error"); }
  };

  return (
    <form onSubmit={submit} className="mt-3 rounded-xl border border-ink/10 p-3 text-sm">
      <label htmlFor="report-reason" className="mb-1 block text-xs text-ink/50">What's wrong?</label>
      <select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mb-2 w-full rounded-lg border border-ink/10 bg-bg px-2 py-2 text-sm text-ink">
        {REPORT_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <label htmlFor="report-note" className="mb-1 block text-xs text-ink/50">More detail (optional)</label>
      <textarea id="report-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} className="mb-2 w-full rounded-lg border border-ink/10 bg-bg px-2 py-2 text-sm text-ink" />
      {state === "error" && <p role="alert" className="mb-2 text-xs text-pink-400">Couldn't send that. Try again in a moment.</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="min-h-10 flex-1 rounded-lg border border-ink/10 text-xs text-ink/60">Cancel</button>
        <button disabled={state === "sending"} className="min-h-10 flex-1 rounded-lg bg-violet-500 text-xs font-medium text-white disabled:opacity-60">{state === "sending" ? "Sending…" : "Send report"}</button>
      </div>
    </form>
  );
}
