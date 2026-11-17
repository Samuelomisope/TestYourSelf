// Turns tutor text into something a speech engine can read (Phase E). Tutor text is Markdown with LaTeX and citation
// markers; read literally, a speech engine says "dollar dollar x caret two". Pure and tested, so it can be trusted
// when a student is listening rather than reading.

const GREEK = { alpha: "alpha", beta: "beta", gamma: "gamma", delta: "delta", epsilon: "epsilon", varepsilon: "epsilon", theta: "theta", lambda: "lambda", mu: "mu", pi: "pi", sigma: "sigma", omega: "omega", phi: "phi", Delta: "delta", Sigma: "sigma", Omega: "omega", Pi: "pi" };
const WORDS = {
  infty: "infinity", to: "approaches", rightarrow: "approaches", Rightarrow: "implies", cdot: "times", times: "times", pm: "plus or minus",
  le: "is less than or equal to", leq: "is less than or equal to", ge: "is greater than or equal to", geq: "is greater than or equal to",
  neq: "does not equal", ne: "does not equal", approx: "is approximately", sum: "the sum of", int: "the integral of", lim: "the limit of",
  ldots: "and so on", dots: "and so on", in: "is in", partial: "partial", nabla: "nabla", sin: "sine", cos: "cosine", tan: "tangent", ln: "natural log", log: "log",
};
const POWER_WORDS = { 2: "squared", 3: "cubed" };
const FALLBACK = "the formula shown on the board";
const MAX_FORMULA = 120;

const group = (tex, start) => { // the text of a {...} group starting at `start`, and where it ends
  let depth = 0;
  for (let i = start; i < tex.length; i++) {
    if (tex[i] === "{") depth++;
    else if (tex[i] === "}" && --depth === 0) return { body: tex.slice(start + 1, i), end: i + 1 };
  }
  return null;
};

/** A spoken version of one LaTeX formula, or "the formula shown on the board" when it is too complex to read aloud. */
export function latexToSpeech(latex) {
  let tex = String(latex ?? "").replace(/\\(left|right|big|Big|bigg|Bigg)\b/g, "").replace(/\\[,;:! ]/g, " ").replace(/\\(text|mathrm|mathbf|mathit|operatorname)\s*\{([^{}]*)\}/g, "$2").trim();
  if (!tex || tex.length > MAX_FORMULA) return FALLBACK;
  const convert = (input) => {
    let out = "";
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (ch === "\\") {
        const name = /^[A-Za-z]+/.exec(input.slice(i + 1))?.[0];
        if (!name) return null;
        i += name.length;
        if (name === "frac" || name === "dfrac") {
          const top = group(input, i + 1);
          const bottom = top && group(input, top.end);
          if (!top || !bottom) return null;
          const a = convert(top.body); const b = convert(bottom.body);
          if (a === null || b === null) return null;
          out += ` ${a} over ${b} `;
          i = bottom.end - 1;
        } else if (name === "sqrt") {
          const arg = group(input, i + 1);
          if (!arg) return null;
          const inner = convert(arg.body);
          if (inner === null) return null;
          out += ` the square root of ${inner} `;
          i = arg.end - 1;
        } else if (GREEK[name]) out += ` ${GREEK[name]} `;
        else if (WORDS[name]) out += ` ${WORDS[name]} `;
        else return null; // an unknown command: do not guess
      } else if (ch === "^" || ch === "_") {
        const arg = input[i + 1] === "{" ? group(input, i + 1) : { body: input[i + 1] ?? "", end: i + 2 };
        if (!arg?.body) return null;
        const inner = convert(arg.body);
        if (inner === null) return null;
        const word = ch === "^" ? (POWER_WORDS[inner.trim()] ?? `to the power ${inner}`) : `sub ${inner}`;
        out += ` ${word} `;
        i = arg.end - 1;
      } else if (ch === "{" || ch === "}") out += " ";
      else if (ch === "=") out += " equals ";
      else if (ch === "+") out += " plus ";
      else if (ch === "-") out += " minus ";
      else if (ch === "<") out += " is less than ";
      else if (ch === ">") out += " is greater than ";
      else if (ch === "/") out += " over ";
      else if (ch === "(" || ch === ")" || ch === "[" || ch === "]") out += " ";
      else out += ch;
    }
    return out;
  };
  const spoken = convert(tex);
  return spoken === null ? FALLBACK : spoken.replace(/\s+/g, " ").trim() || FALLBACK;
}

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;

/** Plain text for speech: no Markdown, no citation markers, formulas spoken as words. Returns "" for nothing to say. */
export function speakable(text) {
  if (typeof text !== "string") return "";
  let out = text
    .replace(/```[\s\S]*?```/g, " ") // a code block is not read aloud
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => ` ${latexToSpeech(tex)} `)
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, tex) => ` ${latexToSpeech(tex)} `)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, tex) => ` ${latexToSpeech(tex)} `)
    .replace(/\$([^$\n]{1,200}?)\$/g, (_, tex) => ` ${latexToSpeech(tex)} `)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\((?:[^)]*)\)/g, "$1")
    .replace(/\[\s*\d+(?:\s*[,–-]\s*\d+)*\s*\]/g, " ") // citation markers like [1] or [2, 3]
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,;:!?]|$)/g, "$1$2")
    .replace(/<[^>]+>/g, " ")
    .replace(EMOJI, " ")
    .replace(/(\d)\s?%/g, "$1 percent")
    .replace(/\s&\s/g, " and ")
    .replace(/\s*[→]\s*/g, " leads to ")
    .replace(/\s*≤\s*/g, " is less than or equal to ")
    .replace(/\s*≥\s*/g, " is greater than or equal to ")
    .replace(/\s*≠\s*/g, " does not equal ")
    .replace(/\s+/g, " ")
    .trim();
  // Leftover markup punctuation that would be read as "asterisk" or "backslash".
  out = out.replace(/[*_~\\|]/g, " ").replace(/\s+([.,;:!?])/g, "$1").replace(/\s+/g, " ").trim();
  return /[\p{L}\p{N}]/u.test(out) ? out : "";
}

/** What an event says aloud: its text for SAY, the question for CHECK, and nothing for events that only change the board. */
export function eventSpeech(event) {
  if (!event || typeof event !== "object") return "";
  if (event.type === "SAY") return speakable(event.text);
  if (event.type === "CHECK") return speakable(event.question);
  return "";
}

const ABBREVIATIONS = /(?:e\.g|i\.e|etc|vs|cf|fig|eq|dr|mr|mrs|ms|prof|no)\.$/i;

/**
 * Splits text into pieces a speech engine can read reliably (Chrome stops long utterances after about 15 seconds).
 * Every piece is an exact, trimmed slice of the input, so a position in a piece maps back to the original text.
 */
export function splitSentences(text, max = 200) {
  const source = String(text ?? "");
  const pieces = [];
  const re = /\S[\s\S]*?(?:[.!?…]+(?=\s|$)|$)/g;
  let match;
  let pending = "";
  while ((match = re.exec(source)) && match[0]) {
    pending = pending ? `${pending} ${match[0]}` : match[0];
    if (ABBREVIATIONS.test(match[0])) continue;
    pieces.push(pending);
    pending = "";
  }
  if (pending) pieces.push(pending);

  const out = [];
  for (const piece of pieces) {
    if (piece.length <= max) { out.push(piece); continue; }
    let rest = piece;
    while (rest.length > max) {
      const window = rest.slice(0, max);
      let cut = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "), window.lastIndexOf(": "));
      if (cut < max * 0.4) cut = window.lastIndexOf(" ");
      if (cut <= 0) cut = max;
      else cut += 1;
      out.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) out.push(rest);
  }
  return out.filter(Boolean);
}
