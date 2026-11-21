// The student's voice (Phase E). Wraps the browser's speech recognition so the lesson code does not depend on it; a
// recorded-audio provider could replace it later. Browser recognition often sends audio to the browser vendor, which
// the screen says next to the microphone button.

/** The words heard so far: { final, interim } from a SpeechRecognition result list. Tolerates odd or empty lists. */
export function assembleTranscript(results) {
  let final = "";
  let interim = "";
  for (let i = 0; i < (results?.length ?? 0); i++) {
    const result = results[i];
    const text = typeof result?.[0]?.transcript === "string" ? result[0].transcript : "";
    if (result?.isFinal) final += text; else interim += text;
  }
  return { final: final.replace(/\s+/g, " ").trim(), interim: interim.replace(/\s+/g, " ").trim() };
}

/** A plain-language message for a recognition error code; "" for ones that need no message (the student stopped it). */
export function describeRecognitionError(code) {
  switch (code) {
    case "aborted": return "";
    case "not-allowed":
    case "service-not-allowed": return "The microphone is blocked. Allow microphone access for this site in your browser settings, then try again.";
    case "no-speech": return "I didn't hear anything. Tap the microphone and try again.";
    case "audio-capture": return "No microphone was found on this device.";
    case "network": return "Speech recognition needs an internet connection.";
    case "language-not-supported": return "This browser can't recognise that language.";
    default: return "Voice input stopped unexpectedly. You can type your question instead.";
  }
}

/** Joins dictated words onto what is already in the input box with one space between them. */
export function appendDictation(existing, heard) {
  const base = String(existing ?? "").trimEnd();
  const add = String(heard ?? "").trim();
  if (!add) return String(existing ?? "");
  return base ? `${base} ${add}` : add;
}

export function createBrowserRecognition(env = globalThis) {
  const Recognition = env.SpeechRecognition || env.webkitSpeechRecognition;
  const supported = typeof Recognition === "function";
  let active = null;

  /**
   * Starts listening for one question. Callbacks: onInterim(text) while speaking, onFinal(text) once words are settled,
   * onEnd({ error }) exactly once when listening stops. Returns { stop, abort }; stop() still delivers what was heard.
   */
  function start({ lang = "en-NG", onInterim, onFinal, onEnd } = {}) {
    active?.abort();
    if (!supported) { onEnd?.({ error: "unsupported" }); return { stop() {}, abort() {} }; }
    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    let error = "";
    let delivered = "";
    let ended = false;
    recognition.onresult = (event) => {
      const { final, interim } = assembleTranscript(event.results);
      if (interim) onInterim?.(interim);
      if (final && final !== delivered) { delivered = final; onFinal?.(final); }
    };
    recognition.onerror = (event) => { error = event?.error || "unknown"; };
    recognition.onend = () => {
      if (ended) return;
      ended = true;
      if (active === handle) active = null;
      onEnd?.({ error });
    };
    const handle = {
      stop() { try { recognition.stop(); } catch { /* already stopped */ } },
      abort() { try { recognition.abort(); } catch { /* already stopped */ } },
    };
    active = handle;
    try { recognition.start(); } catch { error = "unknown"; ended = true; active = null; onEnd?.({ error }); }
    return handle;
  }

  return { supported, start, abort() { active?.abort(); } };
}
