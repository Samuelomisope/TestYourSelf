// State and helpers for the step check-in (Phase H). Pure: the component only renders and calls the API.

export const initialCheck = { phase: "idle", assessment: null, answers: {}, index: 0, result: null, error: "" };

export function checkReducer(state, action) {
  switch (action.type) {
    case "open": return { ...initialCheck, phase: "loading" };
    case "loaded": return state.phase === "loading" ? { ...initialCheck, phase: "answering", assessment: action.assessment } : state;
    case "fail": return { ...state, phase: "error", error: action.message || "Something went wrong." };
    case "answer": return state.phase === "answering" ? { ...state, answers: { ...state.answers, [action.id]: { ...state.answers[action.id], ...action.value } } } : state;
    case "go": {
      const last = (state.assessment?.questions.length ?? 1) - 1;
      return state.phase === "answering" ? { ...state, index: Math.min(Math.max(action.index, 0), last) } : state;
    }
    case "submitting": return state.phase === "answering" ? { ...state, phase: "submitting" } : state;
    case "result": return state.phase === "submitting" ? { ...state, phase: "result", result: action.result } : state;
    case "retry": return state.assessment ? { ...state, phase: "answering", answers: {}, index: 0, result: null, error: "" } : state;
    // After a failed send the student keeps what they typed and can send again.
    case "resume": return state.assessment && state.phase === "error" ? { ...state, phase: "answering", error: "" } : state;
    case "close": return initialCheck;
    default: return state;
  }
}

/** True when the student has given an answer to this question. A blank typed answer does not count. */
export function isAnswered(question, answers) {
  const a = answers?.[question.id];
  if (!a) return false;
  if (question.kind === "MCQ") return Number.isInteger(a.choice);
  if (question.kind === "TRUE_FALSE") return typeof a.truth === "boolean";
  return typeof a.text === "string" && a.text.trim().length > 0;
}

/** Everything except the optional typed question must be answered before sending. */
export const canSubmit = (questions, answers) => questions.length > 0 && questions.every((q) => q.kind === "SHORT" || isAnswered(q, answers));

/** The request body: only answered questions, with typed text trimmed to the server's limit. */
export function buildAnswers(questions, answers) {
  return questions.filter((q) => isAnswered(q, answers)).map((q) => {
    const a = answers[q.id];
    return q.kind === "MCQ" ? { questionId: q.id, choice: a.choice } : q.kind === "TRUE_FALSE" ? { questionId: q.id, truth: a.truth } : { questionId: q.id, text: a.text.trim().slice(0, 300) };
  });
}

/** A kind, honest line for the score, and whether the tutor should celebrate. */
export function describeScore(score, total) {
  if (!(total > 0)) return { message: "Your answers were saved, but nothing could be marked this time.", celebrate: false };
  const ratio = score / total;
  if (ratio === 1) return { message: `Perfect: ${score} of ${total}.`, celebrate: true };
  if (ratio >= 0.8) return { message: `Well done: ${score} of ${total}.`, celebrate: true };
  if (ratio >= 0.5) return { message: `${score} of ${total}. You have most of it; read the explanations below and try again.`, celebrate: false };
  return { message: `${score} of ${total}. That is a good place to start: go through the explanations, then try again.`, celebrate: false };
}

/** A message the student can act on, from an API error. */
export function checkErrorMessage(error) {
  const text = String(error?.serverMessage || "");
  if (/quota/i.test(text)) return "You have used today's tutor turns. Try again tomorrow.";
  if (error?.status === 409 && text) return text;
  if (error?.status === 429) return "That was too fast. Wait a moment and try again.";
  return "The check-in could not load. Try again.";
}
