import { useState } from "react";
import { BookOpen, ChevronUp, ListChecks, LogOut, UserRound } from "lucide-react";
import "./ClassroomLayout.css";

const SIDE_TABS = [["lesson", "Lesson"], ["materials", "Materials"]];
const PANELS = [["lecturer", "Lecturer", UserRound], ["board", "Board", BookOpen], ["outline", "Outline", ListChecks]];

/**
 * The lecture-hall arrangement of the Classroom. It only places the pieces it is given; all lesson state lives in
 * Classroom.jsx, so desktop, phone portrait and phone landscape share one session and a rotation cannot restart a lesson.
 */
export default function ClassroomLayout({
  title, subtitle, stepLabel, percent, statusLabel, onExit,
  lecturer, resume, boardNav, board, transcript, chips, dock, outline, materials,
  startOnBoard = false,
}) {
  const [panel, setPanel] = useState(startOnBoard ? "board" : "lecturer");
  const [center, setCenter] = useState(startOnBoard ? "board" : "transcript");
  const [sideTab, setSideTab] = useState("lesson");
  const [side, setSide] = useState("open");
  const [moreOpen, setMoreOpen] = useState(false);
  const hasBoard = Boolean(board);
  const showBoard = hasBoard && center === "board";
  const pick = (next) => setPanel(next);

  return (
    <div className="cr21 dark" data-panel={panel} data-side={side} role="region" aria-label="Classroom">
      <header className="cr21-head">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold uppercase tracking-wider text-ink/60">UniLib AI Classroom{subtitle ? ` · ${subtitle}` : ""}</p>
          <h1 className="truncate">{title}</h1>
        </div>
        <div className="hidden items-center gap-2 sm:flex" aria-label={`${percent}% complete`}>
          <div className="cr21-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Lesson progress"><i style={{ width: `${percent}%` }} /></div>
          <span className="text-xs font-semibold text-ink/80">{percent}%</span>
        </div>
        <span className="hidden text-xs font-semibold text-ink/80 md:inline">{stepLabel}</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-400" />{statusLabel}</span>
        <button type="button" onClick={onExit} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-ink/20 px-3 text-xs font-bold hover:bg-ink/10 focus-visible:outline-2 focus-visible:outline-violet-400">
          <LogOut aria-hidden="true" className="h-4 w-4" /> Exit
        </button>
      </header>

      <div className="flex items-center gap-2 px-3 pt-2 sm:hidden" aria-hidden={false}>
        <div className="cr21-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Lesson progress"><i style={{ width: `${percent}%` }} /></div>
        <span className="text-xs font-semibold text-ink/80">{percent}% · {stepLabel}</span>
      </div>

      <div className="cr21-main">
        <section className="cr21-lecturer" aria-label="Lecturer">{lecturer}{resume}</section>

        <section className="cr21-center" aria-label="Teaching area">
          <div className="cr21-tabs" role="group" aria-label="Show">
            {hasBoard && <button type="button" className="cr21-tab" aria-pressed={center === "board"} onClick={() => setCenter("board")}>Board</button>}
            <button type="button" className="cr21-tab" aria-pressed={center === "transcript" || !hasBoard} onClick={() => setCenter("transcript")}>Lesson notes</button>
          </div>
          <div className="cr21-center-body">
            {showBoard ? <>{boardNav}{board}</> : transcript}
          </div>
        </section>

        <aside className="cr21-side" aria-label="Lesson sidebar">
          <div className="cr21-tabs mb-3" role="group" aria-label="Sidebar">
            {SIDE_TABS.map(([id, label]) => (
              <button key={id} type="button" className="cr21-tab" aria-pressed={sideTab === id} onClick={() => setSideTab(id)}>{label}</button>
            ))}
            <button type="button" className="cr21-tab hidden lg:block" style={{ flex: "0 0 auto" }} onClick={() => setSide("closed")} aria-label="Hide the sidebar">Hide</button>
          </div>
          <div className="space-y-4">{sideTab === "lesson" ? outline : materials}</div>
        </aside>

        <div className="cr21-dock">
          <div className="cr21-chips-wrap" data-open={moreOpen}>{chips}</div>
          {dock}
          <div className="mt-1 flex items-center justify-between lg:hidden">
            <button type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-bold text-ink/80 focus-visible:outline-2 focus-visible:outline-violet-400">
              Actions <ChevronUp aria-hidden="true" className={`h-4 w-4 transition ${moreOpen ? "" : "rotate-180"}`} />
            </button>
          </div>
        </div>

        <nav className="cr21-nav" aria-label="Classroom views">
          {PANELS.map(([id, label, Icon]) => (
            <button key={id} type="button" data-kind={id} className="cr21-tab inline-flex flex-col items-center justify-center gap-0.5" aria-selected={panel === id} onClick={() => { pick(id); if (id === "board") setCenter(hasBoard ? "board" : "transcript"); }}>
              <Icon aria-hidden="true" className="h-4 w-4" /><span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {side === "closed" && (
        <button type="button" onClick={() => setSide("open")} className="fixed bottom-24 right-3 hidden min-h-10 rounded-lg border border-ink/20 bg-bg-elevated px-3 text-xs font-bold lg:block">Show sidebar</button>
      )}
    </div>
  );
}
