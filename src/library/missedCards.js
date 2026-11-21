// Turns the questions a student got wrong into flashcards (question on the front, the right answer on the back).
const clip = (text, n) => String(text ?? "").trim().slice(0, n);

export function missedToCards(questions, answers) {
  const out = [];
  (Array.isArray(questions) ? questions : []).forEach((q, i) => {
    const given = answers?.[i];
    if (given === undefined || given === q?.answer || !q?.question || !q?.answer) return;
    const why = q.explanation ? `\n\n${clip(q.explanation, 400)}` : "";
    out.push({ front: clip(q.question, 500), back: `${clip(q.answer, 300)}${why}` });
  });
  return out;
}

export function missedDeckTitle(materialTitle) {
  const base = clip(materialTitle, 80) || "Quiz";
  return `Missed questions: ${base}`;
}
