import { Pause, Play, RotateCcw, SkipBack, SkipForward, Square, Volume2 } from "lucide-react";
import Md from "./Markdown";
import { TUTOR_LABELS } from "./tutorState";
import { RATES } from "./speechOutput";

const button = "inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg border border-ink/10 px-2.5 text-xs font-semibold transition hover:bg-ink/5 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-violet-500";

/** Listen controls for the latest tutor reply, with the line being spoken shown as a caption. */
export default function VoiceBar({ state, status, caption, error, canListen, rate, onRate, voices, voiceName, voice, onVoice, autoSpeak, onAutoSpeak, controls, onListen }) {
  const active = status === "playing" || status === "paused";
  const english = voices.filter((v) => /^en(-|_|$)/i.test(v.lang));
  return (
    <section aria-label="Tutor voice" className="mb-3 rounded-2xl border border-ink/10 bg-bg-elevated p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p role="status" className="mr-auto flex items-center gap-1.5 text-xs font-semibold text-ink/70">
          <Volume2 aria-hidden="true" className="h-4 w-4 text-violet-600 dark:text-violet-300" />{TUTOR_LABELS[state]}
        </p>
        {!active && <button type="button" className={button} disabled={!canListen} onClick={onListen}><Play aria-hidden="true" className="h-4 w-4" />Listen</button>}
        {active && <>
          <button type="button" className={button} onClick={controls.previous} aria-label="Previous part"><SkipBack aria-hidden="true" className="h-4 w-4" /></button>
          {status === "playing"
            ? <button type="button" className={button} onClick={controls.pause}><Pause aria-hidden="true" className="h-4 w-4" />Pause</button>
            : <button type="button" className={button} onClick={controls.resume}><Play aria-hidden="true" className="h-4 w-4" />Resume</button>}
          <button type="button" className={button} onClick={controls.next} aria-label="Next part"><SkipForward aria-hidden="true" className="h-4 w-4" /></button>
          <button type="button" className={button} onClick={controls.stop} aria-label="Stop listening"><Square aria-hidden="true" className="h-4 w-4" /></button>
        </>}
        {status === "done" && <button type="button" className={button} onClick={controls.replay} aria-label="Hear it again"><RotateCcw aria-hidden="true" className="h-4 w-4" /></button>}
      </div>
      {/* Captions are shown, not announced: a screen reader already reads the lesson text itself. */}
      {active && caption && <div aria-live="off" className="mt-2 rounded-xl bg-ink/[0.04] px-3 py-2 text-sm"><Md>{caption}</Md></div>}
      {error && <p role="alert" className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">{error}</p>}
      <details className="mt-2 text-xs text-ink/70">
        <summary className="cursor-pointer select-none font-semibold">Voice settings</summary>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={autoSpeak} onChange={(e) => onAutoSpeak(e.target.checked)} />Read new replies aloud</label>
          <label className="flex items-center gap-2">Speed
            <select value={rate} onChange={(e) => onRate(Number(e.target.value))} className="rounded-md border border-ink/15 bg-transparent px-1.5 py-1">{RATES.map((r) => <option key={r} value={r}>{r}×</option>)}</select>
          </label>
          {english.length > 0 && (
            <label className="flex min-w-0 items-center gap-2">Voice
              <select value={voiceName || voice?.name || ""} onChange={(e) => onVoice(e.target.value)} className="min-w-0 max-w-[14rem] rounded-md border border-ink/15 bg-transparent px-1.5 py-1">
                {english.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
              </select>
            </label>
          )}
        </div>
      </details>
    </section>
  );
}
