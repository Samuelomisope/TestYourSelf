import { EyeOff, Eye } from "lucide-react";
import TutorAvatar2D from "./TutorAvatar2D";
import Tutor3D from "./Tutor3D";
import { TUTOR_LABELS } from "./tutorState";

/** The tutor's place in the lesson: the animated tutor, its state, and a button to hide it for a calmer screen. */
export default function TutorStage({ state, variant, visible, onToggle, mode = "2d", canChoose = false, onView, onFail }) {
  return (
    <section aria-label="Your tutor" className="rounded-2xl border border-ink/10 bg-bg-elevated">
      <div className="flex items-center gap-3 px-3 py-2">
        {visible && (mode === "3d"
          ? <Tutor3D state={state} variant={variant} onFail={onFail} className="h-28 w-28 shrink-0 sm:h-32 sm:w-32" />
          : <TutorAvatar2D state={state} variant={variant} className="h-24 w-24 shrink-0 sm:h-28 sm:w-28" />)}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-ink/50">UniLib Tutor</p>
          <p className="text-sm font-semibold" role="status">{TUTOR_LABELS[state]}</p>
        </div>
        {visible && canChoose && (
          <div role="group" aria-label="Tutor style" className="flex rounded-lg border border-ink/10 p-0.5 text-xs font-semibold">
            {["2d", "3d"].map((id) => (
              <button key={id} type="button" aria-pressed={mode === id} onClick={() => onView(id)} className={`rounded-md px-2 py-1 uppercase focus-visible:outline-2 focus-visible:outline-violet-500 ${mode === id ? "bg-violet-600 text-white" : "text-ink/60"}`}>{id}</button>
            ))}
          </div>
        )}
        <button type="button" onClick={onToggle} aria-pressed={visible} aria-label={visible ? "Hide the animated tutor" : "Show the animated tutor"}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink/10 hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-violet-500">
          {visible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>
    </section>
  );
}
