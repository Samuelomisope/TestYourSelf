import { Eye, EyeOff } from "lucide-react";
import TutorAvatar2D from "./TutorAvatar2D";
import Tutor3D from "./Tutor3D";
import { TUTOR_LABELS } from "./tutorState";
import { LECTURERS, LECTURER_IDS } from "./lecturers";

/** The lecturer's place in the lecture hall: a large lecturer, a name plate, the visible state, and the lecturer choice. */
export default function LecturerStage({ lecturerId, state, visible, onToggle, onSelect, mode = "2d", canChoose = false, onView, onFail, cue = null }) {
  const lecturer = LECTURERS[lecturerId] ?? LECTURERS.FEMALE;
  return (
    <section aria-label="Your lecturer" className="rounded-2xl border border-ink/15 bg-gradient-to-b from-violet-500/15 to-transparent p-3">
      <div className="flex flex-col items-center gap-2 text-center">
        {visible && (mode === "3d"
          ? <Tutor3D state={state} variant={lecturer.id} cue={cue} onFail={onFail} className="h-[clamp(7rem,34vh,14rem)] w-full max-w-[16rem]" />
          : <TutorAvatar2D state={state} variant={lecturer.id} className="h-40 w-36" />)}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{lecturer.name}</p>
          <p className="text-xs text-ink/65">{lecturer.role}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-ink/10 px-2.5 py-0.5 text-xs font-semibold" role="status">
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${state === "speaking" ? "bg-emerald-400 motion-safe:animate-pulse" : "bg-ink/40"}`} />
            {TUTOR_LABELS[state]}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <div role="group" aria-label="Choose your lecturer" className="flex rounded-lg border border-ink/20 p-0.5 text-xs font-semibold">
          {LECTURER_IDS.map((id) => (
            <button key={id} type="button" aria-pressed={lecturer.id === id} onClick={() => onSelect(id)} className={`min-h-9 rounded-md px-2.5 focus-visible:outline-2 focus-visible:outline-violet-400 ${lecturer.id === id ? "bg-violet-600 text-white" : "hover:bg-ink/10"}`}>
              {id === "FEMALE" ? "Female" : "Male"}
            </button>
          ))}
        </div>
        {visible && canChoose && (
          <div role="group" aria-label="Lecturer style" className="flex rounded-lg border border-ink/20 p-0.5 text-xs font-semibold">
            {["2d", "3d"].map((id) => (
              <button key={id} type="button" aria-pressed={mode === id} onClick={() => onView(id)} className={`min-h-9 rounded-md px-2 uppercase focus-visible:outline-2 focus-visible:outline-violet-400 ${mode === id ? "bg-violet-600 text-white" : "hover:bg-ink/10"}`}>{id}</button>
            ))}
          </div>
        )}
        <button type="button" onClick={onToggle} aria-pressed={visible} aria-label={visible ? "Hide the animated lecturer" : "Show the animated lecturer"} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink/20 hover:bg-ink/10 focus-visible:outline-2 focus-visible:outline-violet-400">
          {visible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>
    </section>
  );
}
