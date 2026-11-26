import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../api";
import { WINDOWS, barPercent, coverageNote, premiumShare, rankFeatures } from "./usageView.js";

const chip = (active) => `min-h-11 rounded-full border px-4 text-sm font-medium transition ${active ? "border-violet-500 bg-violet-600 text-white" : "border-line text-ink hover:border-violet-500/50"}`;

/** Admin: which sections people open and use most. */
export default function FeatureUsageTab() {
  const [days, setDays] = useState(30);
  const [by, setBy] = useState("opened");
  const [report, setReport] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show the loading state again when the window changes
    setState("loading");
    apiGet(`/admin/feature-usage?days=${days}`)
      .then((data) => { if (!cancelled) { setReport(data); setState("ready"); } })
      .catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, [days]);

  const rows = useMemo(() => rankFeatures(report?.features, by), [report, by]);
  const peopleOf = (f) => (by === "used" ? f.users : f.visitors);
  const timesOf = (f) => (by === "used" ? f.actions : f.visits);
  const premiumOf = (f) => (by === "used" ? f.premiumUsers : f.premiumVisitors);
  const top = rows.length ? peopleOf(rows[0]) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Time period">
        {WINDOWS.map((d) => <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)} className={chip(days === d)}>Last {d} days</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Ranking">
        <button type="button" aria-pressed={by === "opened"} onClick={() => setBy("opened")} className={chip(by === "opened")}>Most opened</button>
        <button type="button" aria-pressed={by === "used"} onClick={() => setBy("used")} className={chip(by === "used")}>Most used</button>
      </div>
      <p className="text-xs text-ink/60">
        <strong>Opened</strong> counts people who opened a section. <strong>Used</strong> counts people who did something in it, such as a flashcard review, a lesson turn or an upload.
        Browsing sections that record no action (Home, Search, Past question practice) only shows under Opened.
      </p>

      {state === "loading" && <p role="status" className="py-10 text-center text-sm text-ink/60">Loading…</p>}
      {state === "error" && <p role="alert" className="py-10 text-center text-sm text-ink/70">The usage report could not be loaded. Try again in a moment.</p>}

      {state === "ready" && report && (
        <>
          <p className="rounded-xl border border-line bg-surface px-4 py-3 text-xs text-ink/80">{coverageNote(report)}</p>
          <ol className="space-y-3">
            {rows.map((f, i) => {
              const share = premiumShare(premiumOf(f), peopleOf(f));
              return (
                <li key={f.key} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 text-sm font-semibold"><span className="mr-2 text-ink/50">{i + 1}.</span>{f.label}</p>
                    <p className="shrink-0 text-sm font-bold">{peopleOf(f).toLocaleString()} <span className="text-xs font-normal text-ink/60">{peopleOf(f) === 1 ? "person" : "people"}</span></p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-ink/10" role="presentation">
                    <div className="h-2 rounded-full bg-violet-500" style={{ width: `${barPercent(peopleOf(f), top)}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-ink/60">
                    {timesOf(f).toLocaleString()} {by === "used" ? "actions" : "visits"}
                    {share !== null && <> · {share}% on Premium</>}
                    {by === "opened" && f.users > 0 && <> · {f.users.toLocaleString()} also used it</>}
                    {by === "used" && f.visitors > 0 && <> · {f.visitors.toLocaleString()} opened it</>}
                  </p>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
