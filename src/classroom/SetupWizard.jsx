import { useState } from "react";

const MODES = [
  { value: "CLASSROOM", title: "Guided lesson", hint: "The tutor prepares objectives and an outline, then teaches one step at a time." },
  { value: "CONVERSATION", title: "Conversation", hint: "Ask anything in any order. No fixed plan." },
];

const SOURCES = [
  { value: "GENERAL", title: "General knowledge", hint: "Teach from standard university material." },
  { value: "UPLOADED", title: "My notes", hint: "Upload PDFs, documents or photos after you start." },
  { value: "LIBRARY", title: "UniLib materials", hint: "Pick materials from the UniLib library after you start." },
];

const VOICES = [
  { value: "FEMALE", title: "Female tutor" },
  { value: "MALE", title: "Male tutor" },
];

function Choice({ name, value, checked, onChange, title, hint }) {
  return (
    <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-left transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500 ${checked ? "border-violet-500 bg-violet-500/10" : "border-ink/10 hover:border-violet-500/40"}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="sr-only" />
      <span aria-hidden="true" className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${checked ? "border-violet-600 bg-violet-600 shadow-[inset_0_0_0_2px_rgb(var(--bg-elevated))]" : "border-ink/30"}`} />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        {hint && <span className="mt-0.5 block text-xs leading-5 text-ink/55">{hint}</span>}
      </span>
    </label>
  );
}

function Group({ legend, children, columns = "sm:grid-cols-2" }) {
  return (
    <fieldset className="mt-5">
      <legend className="text-sm font-semibold">{legend}</legend>
      <div className={`mt-2 grid gap-2 ${columns}`}>{children}</div>
    </fieldset>
  );
}

/** Starts a lesson: topic, how it is taught, where the content comes from, and which tutor. */
export default function SetupWizard({ onCreate, busy }) {
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState("CLASSROOM");
  const [sourceMode, setSourceMode] = useState("GENERAL");
  const [tutorVoice, setTutorVoice] = useState("FEMALE");

  function submit(e) {
    e.preventDefault();
    if (!topic.trim() || busy) return;
    onCreate({ topic: topic.trim(), mode, sourceMode, tutorVoice });
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="classroom-topic" className="block text-sm font-semibold">What would you like to learn?</label>
      <input
        id="classroom-topic" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={160} required
        placeholder="e.g. Integration by substitution"
        className="mt-2 w-full rounded-xl border border-ink/10 bg-bg px-4 py-3 outline-none focus:border-violet-500"
      />

      <Group legend="How should it be taught?">
        {MODES.map((item) => <Choice key={item.value} name="classroom-mode" checked={mode === item.value} onChange={setMode} {...item} />)}
      </Group>

      <Group legend="What should the tutor teach from?" columns="sm:grid-cols-3">
        {SOURCES.map((item) => <Choice key={item.value} name="classroom-source" checked={sourceMode === item.value} onChange={setSourceMode} {...item} />)}
      </Group>

      <Group legend="Your tutor">
        {VOICES.map((item) => <Choice key={item.value} name="classroom-voice" checked={tutorVoice === item.value} onChange={setTutorVoice} {...item} />)}
      </Group>

      <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink/50">
        <span className="rounded-full border border-dashed border-ink/20 px-2.5 py-1">Voice lessons · coming soon</span>
        <span className="rounded-full border border-dashed border-ink/20 px-2.5 py-1">Animated 3D tutor · coming soon</span>
      </p>

      <button disabled={busy || !topic.trim()} className="mt-5 w-full rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50 sm:w-auto">
        {busy ? "Starting…" : "Start lesson"}
      </button>
    </form>
  );
}
