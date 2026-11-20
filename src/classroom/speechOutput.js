// The tutor's voice (Phase E). `createBrowserSpeech` uses the browser's built-in speech synthesis; anything with the
// same shape (a server voice later) can replace it, so lesson code never talks to the browser directly.
//
//   provider.supported            true when this browser can speak
//   provider.voices()             the installed voices
//   provider.speak(text, options) starts speaking and returns { done, pause, resume, cancel }
//     options: { voice, rate, onStart, onBoundary }
//     done resolves once with { status: "ended" | "cancelled" | "error", error? }
//
// Pausing stops the current sentence and resume() says it again from its start. That is what every browser can do:
// synth.pause() is ignored or acts as a cancel on some phones.
import { splitSentences } from "./speakable.js";

const FEMALE = /\b(female|woman|samantha|zira|susan|hazel|aria|jenny|karen|moira|tessa|victoria|fiona|serena|libby|sonia|natasha|catherine|linda|heera|raveena)\b/i;
const MALE = /\b(male|man|david|mark|daniel|george|ryan|alex|fred|guy|oliver|james|thomas|ravi|brian|christopher|eric|roger|steffan|liam)\b/i;
const LANG_ORDER = ["en-NG", "en-GB", "en-US", "en-ZA", "en-AU", "en-IN"];

/** The gender a voice name suggests, or "" when it does not say. Browsers do not report gender, so this is a guess. */
export function guessGender(name) {
  const value = String(name ?? "");
  if (/\bmale\b/i.test(value) && !/\bfemale\b/i.test(value)) return "MALE";
  if (FEMALE.test(value)) return "FEMALE";
  if (MALE.test(value)) return "MALE";
  return "";
}

/**
 * Chooses a voice: the one named (if installed), otherwise an English voice that matches the wanted gender, preferring
 * voices installed on the device (they work offline and report word positions) and English varieties close to Nigerian English.
 */
export function pickVoice(voices, { name = "", gender = "" } = {}) {
  const list = Array.isArray(voices) ? voices.filter((v) => v && typeof v.name === "string") : [];
  if (name) { const exact = list.find((v) => v.name === name); if (exact) return exact; }
  const score = (voice) => {
    const lang = String(voice.lang ?? "").replace("_", "-");
    if (!/^en(-|$)/i.test(lang)) return -1;
    const order = LANG_ORDER.findIndex((l) => l.toLowerCase() === lang.toLowerCase());
    let value = 10 - (order === -1 ? LANG_ORDER.length : order);
    if (voice.localService) value += 5;
    if (gender && guessGender(voice.name) === gender) value += 20;
    else if (gender && guessGender(voice.name) && guessGender(voice.name) !== gender) value -= 5;
    return value;
  };
  return list.map((voice) => ({ voice, value: score(voice) })).filter((e) => e.value >= 0).sort((a, b) => b.value - a.value)[0]?.voice ?? null;
}

export const RATES = [0.75, 1, 1.25, 1.5];
export const clampRate = (rate) => (Number.isFinite(rate) ? Math.min(Math.max(rate, 0.5), 2) : 1);

export function createBrowserSpeech(env = globalThis) {
  const synth = env.speechSynthesis;
  const Utterance = env.SpeechSynthesisUtterance;
  const supported = !!synth && typeof Utterance === "function" && typeof synth.speak === "function";
  let active = null;

  function speak(text, options = {}) {
    active?.cancel();
    const chunks = splitSentences(text);
    let resolveDone;
    const done = new Promise((resolve) => { resolveDone = resolve; });
    if (!supported || !chunks.length) {
      resolveDone(supported ? { status: "ended" } : { status: "error", error: "unsupported" });
      return { done, pause() {}, resume() {}, cancel() {} };
    }
    // Where each piece starts in `text`, so a word position inside a piece maps back to the whole text.
    const offsets = [];
    let from = 0;
    for (const chunk of chunks) { const at = text.indexOf(chunk, from); offsets.push(at < 0 ? from : at); from = (at < 0 ? from : at) + chunk.length; }

    let index = 0;
    let state = "speaking";
    let token = 0;
    let started = false;
    const finish = (result) => {
      if (state === "finished") return;
      state = "finished";
      if (active === handle) active = null;
      resolveDone(result);
    };
    const playChunk = () => {
      if (index >= chunks.length) { finish({ status: "ended" }); return; }
      const mine = ++token;
      const utterance = new Utterance(chunks[index]);
      if (options.voice) { utterance.voice = options.voice; utterance.lang = options.voice.lang; }
      utterance.rate = clampRate(options.rate);
      utterance.onstart = () => { if (token === mine && !started) { started = true; options.onStart?.(); } };
      utterance.onboundary = (event) => { if (token === mine) options.onBoundary?.({ charIndex: offsets[index] + (event?.charIndex ?? 0), chunk: index }); };
      utterance.onend = () => { if (token === mine && state === "speaking") { index += 1; playChunk(); } };
      utterance.onerror = (event) => {
        if (token !== mine || event?.error === "interrupted" || event?.error === "canceled") return;
        finish({ status: "error", error: event?.error || "unknown" });
      };
      synth.speak(utterance);
    };
    const handle = {
      done,
      pause() { if (state !== "speaking") return; state = "paused"; token += 1; synth.cancel(); },
      resume() { if (state !== "paused") return; state = "speaking"; playChunk(); },
      cancel() { if (state === "finished") return; token += 1; synth.cancel(); finish({ status: "cancelled" }); },
    };
    active = handle;
    playChunk();
    return handle;
  }

  return {
    supported,
    speak,
    cancel() { active?.cancel(); },
    voices() { return supported && typeof synth.getVoices === "function" ? synth.getVoices() : []; },
    /** Voices load late in some browsers; the callback runs whenever the list changes. Returns an unsubscribe function. */
    onVoicesChanged(callback) {
      if (!supported || typeof synth.addEventListener !== "function") return () => {};
      synth.addEventListener("voiceschanged", callback);
      return () => synth.removeEventListener("voiceschanged", callback);
    },
  };
}
