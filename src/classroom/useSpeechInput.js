import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserRecognition, describeRecognitionError } from "./speechInput";

const recognition = createBrowserRecognition();

/**
 * Dictation for the question box (Phase E). `onText(words)` receives each settled phrase; `onStart` runs when the
 * microphone is switched on, so the tutor can stop talking first. The words are only put in the box, never sent.
 */
export default function useSpeechInput({ onText, onStart } = {}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const handle = useRef(null);
  const session = useRef(0);
  const latest = useRef({ onText, onStart });
  useEffect(() => { latest.current = { onText, onStart }; });
  useEffect(() => () => { recognition.abort(); }, []);

  const start = useCallback(() => {
    latest.current.onStart?.();
    setError("");
    setInterim("");
    setListening(true);
    const id = ++session.current;
    handle.current = recognition.start({
      onInterim: setInterim,
      onFinal: (text) => latest.current.onText?.(text),
      onEnd: ({ error: code }) => {
        if (session.current !== id) return; // a newer session owns the state now
        handle.current = null;
        setListening(false);
        setInterim("");
        if (code) setError(code === "unsupported" ? "Voice input isn't available in this browser." : describeRecognitionError(code));
      },
    });
  }, []);
  const stop = useCallback(() => handle.current?.stop(), []);
  const cancel = useCallback(() => handle.current?.abort(), []); // drops words not yet delivered, e.g. when the question is being sent
  return { supported: recognition.supported, listening, interim, error, start, stop, cancel };
}
