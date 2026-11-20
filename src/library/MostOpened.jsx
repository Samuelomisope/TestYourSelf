import { useEffect, useState } from "react";
import { openedLabel } from "./libraryLinks.js";

// A row of the most opened materials at the person's university, all time. A failure just hides it.
export default function MostOpened({ load, onSelect }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let cancelled = false;
    load().then((rows) => { if (!cancelled && Array.isArray(rows)) setItems(rows); }).catch(() => {});
    return () => { cancelled = true; };
  }, [load]);
  if (items.length === 0) return null;
  return (
    <section aria-label="Most opened" className="mb-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/30">Most opened</h2>
      <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {items.map((m) => (
          <li key={m.id} className="shrink-0">
            <button onClick={() => onSelect(m)} className="w-56 rounded-2xl border border-ink/10 bg-white/[0.03] p-3 text-left transition hover:border-violet-500/30">
              <span className="block truncate text-sm font-semibold text-ink">{m.title}</span>
              <span className="block truncate text-xs text-ink/40">{m.courseRef?.code || "General"}</span>
              <span className="mt-1 block text-xs text-violet-400">{openedLabel(m.downloadCount)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
