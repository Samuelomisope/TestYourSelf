// What this browser can do with voice (Phase E). Voice choices are only offered when they will actually work.

/** { speak, listen }: can the tutor talk, and can the student dictate. Looked up at call time, safe outside a browser. */
export function voiceSupport(env = globalThis) {
  const speak = !!env?.speechSynthesis && typeof env.SpeechSynthesisUtterance === "function";
  const listen = typeof (env?.SpeechRecognition || env?.webkitSpeechRecognition) === "function";
  return { speak, listen };
}
