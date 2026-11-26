import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConfirm } from "./ui/feedbackContext.js";
import { Link, useLocation } from "react-router-dom";
import Button from "./ui/Button.jsx";
import Navbar from "./Navbar";
import { apiGet, apiPost } from "./api";
import { defaultMinutes, formatClock, gradeLabel, remainingSeconds, scoreExam } from "./library/examLogic.js";
import { missedDeckTitle, missedToCards } from "./library/missedCards.js";

const COUNTS = [5, 10, 15];

// Timed practice from a past question paper. The questions are made by AI from the paper's content, so they follow
// its topics and style; they are not copied word for word. Marking happens here, after you submit.
export default function PastQuestions() {
  const confirm = useConfirm();
  const location = useLocation();
  const preset = location.state?.material || null;
  const [stage, setStage] = useState(preset ? "setup" : "pick"); // pick | setup | exam | result
  const [papers, setPapers] = useState(null); // null = loading
  const [filter, setFilter] = useState("");
  const [paper, setPaper] = useState(preset);
  const [count, setCount] = useState(10);
  const [minutes, setMinutes] = useState(defaultMinutes(10));
  const [difficulty, setDifficulty] = useState("Medium");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [startedAt, setStartedAt] = useState(0);
  const [left, setLeft] = useState(0);
  const [finishedAt, setFinishedAt] = useState(0);
  const [saved, setSaved] = useState("idle"); // idle | saving | saved | error
  const submittedRef = useRef(false);

  useEffect(() => {
    if (stage !== "pick" || papers !== null) return undefined;
    let cancelled = false;
    apiGet("/study-material?pastQuestions=true")
      .then((rows) => { if (!cancelled) setPapers(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (!cancelled) { setPapers([]); setError("Couldn't load past question papers."); } });
    return () => { cancelled = true; };
  }, [stage, papers]);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (papers || []).filter((p) => !q || `${p.title} ${p.courseRef?.code || ""} ${p.course || ""}`.toLowerCase().includes(q));
  }, [papers, filter]);

  const submit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setFinishedAt(Date.now());
    setStage("result");
  }, []);

  // The clock. Computed from the start time each tick, so a sleeping tab cannot stretch the time.
  useEffect(() => {
    if (stage !== "exam") return undefined;
    const tick = () => {
      const remaining = remainingSeconds(startedAt, minutes * 60);
      setLeft(remaining);
      if (remaining <= 0) submit();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [stage, startedAt, minutes, submit]);

  useEffect(() => {
    if (stage !== "exam") return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [stage]);

  async function start() {
    setBusy(true); setError("");
    try {
      const data = await apiPost("/ai/quiz/from-material", {
        materialId: paper.id, fileUrl: paper.signedUrl || paper.fileUrl, count, difficulty,
      });
      const qs = Array.isArray(data?.questions) ? data.questions.filter((q) => q?.question && Array.isArray(q.options) && q.answer) : [];
      if (qs.length === 0) throw new Error("empty");
      submittedRef.current = false;
      setQuestions(qs); setAnswers({}); setSaved("idle");
      setStartedAt(Date.now()); setLeft(minutes * 60);
      setStage("exam");
    } catch {
      setError("Couldn't make the practice questions. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  const result = useMemo(() => (stage === "result" ? scoreExam(questions, answers) : null), [stage, questions, answers]);
  const missed = useMemo(() => (result ? missedToCards(questions, answers) : []), [result, questions, answers]);

  async function saveMissed() {
    setSaved("saving");
    try {
      await apiPost("/flashcards/decks", { title: missedDeckTitle(paper?.title), description: "Made from questions you missed in past-question practice.", isPublic: false, cards: missed, sourceType: "MANUAL" });
      setSaved("saved");
    } catch { setSaved("error"); }
  }

  const answered = Object.keys(answers).length;
  const urgent = stage === "exam" && left <= 60;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-28">
        {stage === "pick" && (
          <section>
            <h1 className="text-2xl font-bold">Past question practice</h1>
            <p className="mt-1 text-sm text-ink/50">Pick a past question paper. You'll get a timed set of questions based on it, marked when you submit.</p>
            <label htmlFor="pq-filter" className="sr-only">Search papers</label>
            <input id="pq-filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search by course code or title" className="mt-4 min-h-11 w-full rounded-xl border border-ink/10 bg-bg px-4 text-sm outline-none focus:border-violet-500" />
            {error && <p role="alert" className="mt-3 text-sm text-pink-400">{error}</p>}
            {papers === null && <p className="mt-6 text-sm text-ink/50">Loading papers…</p>}
            {papers !== null && papers.length === 0 && !error && (
              <div className="mt-6 rounded-2xl border border-ink/10 p-5 text-sm text-ink/60">
                <p className="font-medium text-ink">No past question papers yet</p>
                <p className="mt-1">When uploading a file, tick "This is a past question paper". Papers appear here for everyone at your university who can see them.</p>
                <Button to="/study-material" className="mt-3">Go to the library</Button>
              </div>
            )}
            <ul className="mt-4 space-y-2">
              {shown.map((p) => (
                <li key={p.id}>
                  <button onClick={() => { setPaper(p); setError(""); setStage("setup"); }} className="min-h-14 w-full rounded-2xl border border-ink/10 bg-white/[0.03] px-4 py-3 text-left transition hover:border-violet-500/40">
                    <span className="block truncate text-sm font-semibold">{p.title}</span>
                    <span className="block truncate text-xs text-ink/40">{p.courseRef?.code || p.course || "No course"}{p.level ? ` · ${p.level} level` : ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {stage === "setup" && paper && (
          <section>
            <button onClick={() => { setStage("pick"); setError(""); }} className="min-h-11 text-sm text-ink/70 hover:text-ink">← Choose another paper</button>
            <h1 className="mt-2 text-2xl font-bold">{paper.title}</h1>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <label className="text-sm"><span className="mb-1 block text-ink/50">Questions</span>
                <select aria-label="Number of questions" value={count} onChange={(e) => { const n = Number(e.target.value); setCount(n); setMinutes(defaultMinutes(n)); }} className="min-h-11 w-full rounded-xl border border-ink/10 bg-bg px-3">
                  {COUNTS.map((n) => <option key={n} value={n}>{n} questions</option>)}
                </select></label>
              <label className="text-sm"><span className="mb-1 block text-ink/50">Time (minutes)</span>
                <input aria-label="Time in minutes" type="number" min="1" max="180" value={minutes} onChange={(e) => setMinutes(Math.min(180, Math.max(1, Number(e.target.value) || 1)))} className="min-h-11 w-full rounded-xl border border-ink/10 bg-bg px-3" /></label>
              <label className="text-sm"><span className="mb-1 block text-ink/50">Difficulty</span>
                <select aria-label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="min-h-11 w-full rounded-xl border border-ink/10 bg-bg px-3">
                  <option>Easy</option><option>Medium</option><option>Hard</option>
                </select></label>
            </div>
            <p className="mt-4 text-xs text-ink/40">The clock starts when the questions appear and the paper is submitted automatically when time runs out.</p>
            {error && <p role="alert" className="mt-3 text-sm text-pink-400">{error}</p>}
            <Button size="lg" block className="mt-5" onClick={start} loading={busy}>{busy ? "Preparing your questions…" : "Start practice"}</Button>
          </section>
        )}

        {stage === "exam" && (
          <section>
            <div className="sticky top-16 z-10 -mx-4 mb-4 flex items-center justify-between gap-3 border-b border-ink/10 bg-bg/95 px-4 py-3 ">
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{paper?.title}</p><p className="text-xs text-ink/40">{answered} of {questions.length} answered</p></div>
              <p className={`font-mono text-lg font-bold ${urgent ? "text-pink-400" : "text-violet-400"}`} role="timer" aria-label={`Time left ${formatClock(left)}`}>{formatClock(left)}</p>
            </div>
            <span className="sr-only" aria-live="assertive">{left === 300 ? "5 minutes left" : left === 60 ? "1 minute left" : ""}</span>
            <ol className="space-y-5">
              {questions.map((q, qi) => (
                <li key={qi}>
                  <fieldset className="rounded-2xl border border-ink/10 bg-white/[0.03] p-4">
                    <legend className="px-1 text-sm font-semibold">{qi + 1}. {q.question}</legend>
                    <div className="mt-2 space-y-2">
                      {q.options.map((opt) => (
                        <label key={opt} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${answers[qi] === opt ? "border-violet-500 bg-violet-500/10" : "border-ink/10 hover:border-violet-500/30"}`}>
                          <input type="radio" name={`q${qi}`} checked={answers[qi] === opt} onChange={() => setAnswers((a) => ({ ...a, [qi]: opt }))} className="accent-violet-500" />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </li>
              ))}
            </ol>
            <button onClick={async () => { if (answered === questions.length || (await confirm({ title: "Submit with unanswered questions?", message: `You have ${questions.length - answered} unanswered. They will count as missed.`, confirmLabel: "Submit" }))) submit(); }} className="mt-6 min-h-12 w-full rounded-xl bg-violet-500 font-semibold text-white hover:bg-violet-400">Submit answers</button>
          </section>
        )}

        {stage === "result" && result && (
          <section>
            <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 p-5 text-center text-white">
              <p className="text-4xl font-bold">{result.percent}%</p>
              <p className="mt-1 font-semibold">{result.correct} of {result.total} correct</p>
              <p className="text-sm text-white/80">{gradeLabel(result.percent)}</p>
              <p className="mt-2 text-xs text-white/70">Time used {formatClock(Math.min(minutes * 60, Math.round((finishedAt - startedAt) / 1000)))} of {formatClock(minutes * 60)}{result.unanswered ? ` · ${result.unanswered} unanswered` : ""}</p>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {missed.length > 0 && (saved === "saved"
                ? <Link to="/flashcards?tab=mine" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-violet-500/30 text-sm font-medium text-violet-400">Saved. Open your flashcards</Link>
                : <button onClick={saveMissed} disabled={saved === "saving"} className="min-h-11 flex-1 rounded-xl border border-violet-500/30 text-sm font-medium text-violet-400 disabled:opacity-60">{saved === "saving" ? "Saving…" : `Save ${missed.length} missed as flashcards`}</button>)}
              <button onClick={() => { setStage("setup"); setError(""); }} className="min-h-11 flex-1 rounded-xl bg-violet-500 text-sm font-semibold text-white">New attempt</button>
            </div>
            {saved === "error" && <p role="alert" className="mt-2 text-sm text-pink-400">Couldn't save them. Make sure your university is set in your profile.</p>}
            <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-ink/30">Review</h2>
            <ol className="space-y-3">
              {result.rows.map((r) => (
                <li key={r.index} className={`rounded-2xl border p-4 text-sm ${r.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-pink-500/30 bg-pink-500/5"}`}>
                  <p className="font-semibold">{r.index + 1}. {r.question}</p>
                  <p className="mt-1"><span className="text-ink/50">Your answer: </span>{r.answered ? r.given : "No answer"} <span className="font-semibold">{r.ok ? "✓ Correct" : "✗ Wrong"}</span></p>
                  {!r.ok && <p><span className="text-ink/50">Correct answer: </span>{r.answer}</p>}
                  {r.explanation && <p className="mt-1 text-ink/60">{r.explanation}</p>}
                </li>
              ))}
            </ol>
          </section>
        )}
      </main>
    </div>
  );
}
