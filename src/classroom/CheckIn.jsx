import { useEffect, useReducer, useRef } from "react";
import { Check, X } from "lucide-react";
import { apiPost } from "../api";
import { buildAnswers, canSubmit, checkErrorMessage, checkReducer, describeScore, initialCheck, isAnswered } from "./checkIn";
import Markdown from "./Markdown";

const option = "flex w-full cursor-pointer items-start gap-3 rounded-xl border border-ink/10 px-3 py-2.5 text-left text-sm transition has-[:checked]:border-violet-500 has-[:checked]:bg-violet-500/10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-violet-500";
const button = "rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-violet-500 disabled:opacity-50";

function Question({ question, number, total, answer, onAnswer }) {
  const name = `check-${question.id}`;
  return (
    <fieldset>
      <legend className="text-xs font-bold uppercase tracking-wider text-ink/50">Question {number} of {total}</legend>
      <Markdown className="mt-1 text-sm font-semibold text-ink">{question.prompt}</Markdown>
      <div className="mt-3 space-y-2">
        {question.kind === "MCQ" && question.options.map((text, i) => (
          <label key={i} className={option}>
            <input type="radio" name={name} checked={answer?.choice === i} onChange={() => onAnswer({ choice: i })} className="mt-1 accent-violet-600" />
            <span className="min-w-0">{text}</span>
          </label>
        ))}
        {question.kind === "TRUE_FALSE" && [[true, "True"], [false, "False"]].map(([value, label]) => (
          <label key={label} className={option}>
            <input type="radio" name={name} checked={answer?.truth === value} onChange={() => onAnswer({ truth: value })} className="mt-1 accent-violet-600" />
            <span>{label}</span>
          </label>
        ))}
        {question.kind === "SHORT" && (
          <>
            <label htmlFor={name} className="sr-only">Your answer</label>
            <textarea id={name} rows={3} maxLength={300} value={answer?.text ?? ""} onChange={(e) => onAnswer({ text: e.target.value })}
              placeholder="Type a short answer (optional)" className="w-full rounded-xl border border-ink/15 bg-bg px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-violet-500" />
            <p className="text-xs text-ink/50">Optional. A short answer is marked by AI, so it can be wrong.</p>
          </>
        )}
      </div>
    </fieldset>
  );
}

/**
 * A short check at the end of a lesson step. Skippable: it never blocks the lesson. Answers are marked by the server
 * and revealed only after sending. `onScore(celebrate)` lets the tutor react.
 */
export default function CheckIn({ sessionId, stepIndex, stepTitle, onScore, onClose }) {
  const [state, dispatch] = useReducer(checkReducer, initialCheck);
  const alive = useRef(true);
  const heading = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const load = () => {
    dispatch({ type: "open" });
    apiPost(`/classroom/sessions/${sessionId}/steps/${stepIndex}/assessment`, {})
      .then((assessment) => { if (alive.current) dispatch({ type: "loaded", assessment }); })
      .catch((error) => { if (alive.current) dispatch({ type: "fail", message: checkErrorMessage(error) }); });
  };
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [sessionId, stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (state.phase === "result") heading.current?.focus(); }, [state.phase]);

  const questions = state.assessment?.questions ?? [];
  const question = questions[state.index];

  const submit = () => {
    dispatch({ type: "submitting" });
    apiPost(`/classroom/sessions/${sessionId}/assessments/${state.assessment.id}/attempts`, { answers: buildAnswers(questions, state.answers) })
      .then((result) => {
        if (!alive.current) return;
        dispatch({ type: "result", result });
        onScore?.(describeScore(result.score, result.total).celebrate);
      })
      .catch((error) => { if (alive.current) dispatch({ type: "fail", message: checkErrorMessage(error) }); });
  };

  return (
    <section aria-label="Check my understanding" className="mb-3 rounded-2xl border border-violet-500/30 bg-violet-500/[0.06] p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold text-ink">Check my understanding{stepTitle ? <span className="font-medium text-ink/60"> · {stepTitle}</span> : null}</h3>
        <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xs font-semibold text-ink/60 hover:text-ink focus-visible:outline-2 focus-visible:outline-violet-500">Skip</button>
      </div>

      {state.phase === "loading" && <p role="status" className="mt-3 text-sm text-ink/60 motion-safe:animate-pulse">Writing your questions…</p>}

      {state.phase === "error" && (
        <div className="mt-3">
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={state.assessment ? () => dispatch({ type: "resume" }) : load} className={`${button} bg-violet-600 text-white hover:bg-violet-500`}>Try again</button>
            <button type="button" onClick={onClose} className={`${button} text-ink/70`}>Skip</button>
          </div>
        </div>
      )}

      {(state.phase === "answering" || state.phase === "submitting") && question && (
        <div className="mt-3">
          <Question question={question} number={state.index + 1} total={questions.length} answer={state.answers[question.id]} onAnswer={(value) => dispatch({ type: "answer", id: question.id, value })} />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => dispatch({ type: "go", index: state.index - 1 })} disabled={state.index === 0 || state.phase === "submitting"} className={`${button} border border-ink/15`}>Back</button>
            {state.index < questions.length - 1
              ? <button type="button" onClick={() => dispatch({ type: "go", index: state.index + 1 })} className={`${button} bg-violet-600 text-white hover:bg-violet-500`}>{isAnswered(question, state.answers) || question.kind === "SHORT" ? "Next" : "Skip question"}</button>
              : <button type="button" onClick={submit} disabled={!canSubmit(questions, state.answers) || state.phase === "submitting"} className={`${button} bg-violet-600 text-white hover:bg-violet-500`}>{state.phase === "submitting" ? "Marking…" : "Check my answers"}</button>}
            {!canSubmit(questions, state.answers) && state.index === questions.length - 1 && <span className="text-xs text-ink/55">Answer every question except the typed one to check.</span>}
          </div>
        </div>
      )}

      {state.phase === "result" && state.result && (
        <div className="mt-3">
          <p ref={heading} tabIndex={-1} role="status" className="text-sm font-semibold text-ink outline-none">{describeScore(state.result.score, state.result.total).message}</p>
          <ol className="mt-3 space-y-3">
            {state.result.results.map((r, i) => (
              <li key={r.id} className="rounded-xl bg-bg-elevated p-3 text-sm">
                <div className="flex items-start gap-2">
                  {r.correct === true ? <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : r.correct === false ? <X aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /> : <span aria-hidden className="mt-0.5 w-4 shrink-0 text-ink/40">–</span>}
                  <div className="min-w-0 font-semibold"><span className="sr-only">{r.correct === true ? "Correct. " : r.correct === false ? "Incorrect. " : "Not marked. "}Question {i + 1}. </span><Markdown>{r.prompt}</Markdown></div>
                </div>
                <p className="mt-1 text-ink/70">
                  <span className="font-semibold">Answer: </span>
                  {r.kind === "MCQ" ? r.options[r.answer] : r.kind === "TRUE_FALSE" ? (r.answer ? "True" : "False") : r.answer}
                </p>
                <p className="mt-1 text-ink/70">{r.explanation}</p>
                {r.kind === "SHORT" && <p className="mt-1 text-xs text-ink/50">{r.markedBy === "AI" ? "Marked by AI, so it can be wrong." : r.response ? "This answer could not be marked, so it is not in your score." : "No answer given."}</p>}
              </li>
            ))}
          </ol>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => dispatch({ type: "retry" })} className={`${button} border border-ink/15`}>Try again</button>
            <button type="button" onClick={onClose} className={`${button} bg-violet-600 text-white hover:bg-violet-500`}>Done</button>
          </div>
        </div>
      )}
    </section>
  );
}
