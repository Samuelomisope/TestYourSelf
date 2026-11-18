// Mouth movement for a talking tutor (Phase F). The browser's voice gives no audio to measure, only a signal as each
// word starts (on most voices). Each word opens the mouth in the shape of its main vowel and lets it close again. When
// no word signals arrive, a gentle talking rhythm is used instead. It looks like speech, not like exact lip-sync.

const VOWEL_SHAPE = { a: "aa", e: "ee", i: "ih", o: "oh", u: "ou" };

/** The word that starts at or contains `charIndex` of `text`, or "". */
export function wordAt(text, charIndex) {
  const source = String(text ?? "");
  let i = Number.isInteger(charIndex) ? charIndex : -1;
  if (i < 0 || i >= source.length) return "";
  while (i < source.length && /\s/.test(source[i])) i += 1; // a signal on the space before a word means that word
  let start = i;
  while (start > 0 && /\S/.test(source[start - 1])) start -= 1;
  let end = i;
  while (end < source.length && /\S/.test(source[end])) end += 1;
  return source.slice(start, end);
}

/** The mouth shape for a word, from its first vowel: "aa", "ee", "ih", "oh" or "ou" ("aa" when it has none). */
export function visemeForWord(word) {
  const letters = String(word ?? "").toLowerCase().replace(/[^a-z]/g, "");
  const first = /[aeiou]/.exec(letters);
  if (!first) return /y$/.test(letters) ? "ih" : "aa";
  if (first[0] === "o" && letters[first.index + 1] === "o") return "ou"; // "too", "school"
  if (first[0] === "e" && letters[first.index + 1] === "e") return "ee";
  return VOWEL_SHAPE[first[0]];
}

const RISE = 0.05; // seconds for the mouth to open on a word
const FALL = 0.28; // seconds for it to close again
const PEAK = 0.8;
const QUIET_AFTER = 0.5; // seconds without a word signal before the rhythm takes over

/** A small record of the latest word signal. Written when a word starts, read every frame; no React state involved. */
export function createMouthCues() {
  let cue = null;
  return {
    push(viseme, seconds) { if (Number.isFinite(seconds)) cue = { viseme, at: seconds }; },
    clear() { cue = null; },
    /** The mouth at time `seconds`: { viseme, amount } from the latest word, or null when there is no recent word. */
    read(seconds) {
      if (!cue || !Number.isFinite(seconds)) return null;
      const age = seconds - cue.at;
      if (age < 0 || age > QUIET_AFTER) return null;
      const amount = age < RISE ? PEAK * (age / RISE) : Math.max(0, PEAK * (1 - (age - RISE) / FALL));
      return { viseme: cue.viseme, amount };
    },
  };
}

export const mouthCues = createMouthCues();

/**
 * What the mouth should do now. `talking` is whether the tutor is speaking; `rhythm` is the fallback amount (0 to 1).
 * Returns { viseme, amount }.
 */
export function driveMouth(cues, seconds, talking, rhythm = 0) {
  if (!talking) return { viseme: "aa", amount: 0 };
  return cues.read(seconds) ?? { viseme: "aa", amount: Number.isFinite(rhythm) ? Math.min(Math.max(rhythm, 0), 1) : 0 };
}

/** Frame time for a frame-rate cap, kept between 10 and 60 frames per second. */
export const frameInterval = (fps) => 1000 / Math.min(60, Math.max(10, Number.isFinite(fps) ? fps : 30));

/** Draw only when the tab is showing and the tutor is on screen: an idle tutor must not run a phone's battery down. */
export const shouldDraw = ({ hidden = false, onScreen = true } = {}) => !hidden && onScreen;
