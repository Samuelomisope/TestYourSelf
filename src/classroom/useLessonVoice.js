import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { currentEvent, initialPlayer, playerReducer } from "./lessonPlayer";
import { createBrowserSpeech, pickVoice } from "./speechOutput";
import { eventSpeech } from "./speakable";
import { mouthCues, visemeForWord, wordAt } from "./lipSync";

// One speech engine for the page; the browser has a single speech queue anyway.
const speech = createBrowserSpeech();
let voiceCache = [];
const subscribeVoices = (notify) => {
  voiceCache = speech.voices();
  return speech.onVoicesChanged(() => { voiceCache = speech.voices(); notify(); });
};
const voiceSnapshot = () => voiceCache;

/**
 * Plays the lesson events of a tutor reply out loud (Phase E). The reducer in lessonPlayer.js decides what plays next;
 * this hook only speaks the current event and reports when it has finished, so nothing here uses timers.
 *
 * Options: rate, voiceName, gender (the wanted voice), onEvent(event) runs as each event starts.
 */
export default function useLessonVoice({ rate = 1, voiceName = "", gender = "", onEvent } = {}) {
  const [player, dispatch] = useReducer(playerReducer, initialPlayer);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const voices = useSyncExternalStore(subscribeVoices, voiceSnapshot, voiceSnapshot);
  const active = useRef(null); // { id, handle } of the event being spoken
  const latest = useRef({ onEvent });
  useEffect(() => { latest.current = { onEvent }; });
  const voice = useMemo(() => pickVoice(voices, { name: voiceName, gender }), [voices, voiceName, gender]);

  useEffect(() => {
    if (player.status === "paused") { active.current?.handle.pause(); return undefined; }
    if (player.status !== "playing") {
      active.current?.handle.cancel();
      active.current = null;
      return undefined;
    }
    const event = player.events[player.index];
    if (!event) return undefined;
    if (active.current?.id === event.id) { active.current.handle.resume(); return undefined; }

    latest.current.onEvent?.(event);
    const text = eventSpeech(event);
    if (!text) {
      // Nothing to say (a board change): report it finished on the next tick so state is not set while rendering.
      queueMicrotask(() => dispatch({ type: "finished", id: event.id }));
      return undefined;
    }
    const handle = speech.speak(text, {
      voice, rate,
      onStart: () => setSpeaking(true),
      // Each word the voice reports opens the animated tutor's mouth in that word's shape.
      onBoundary: ({ charIndex }) => mouthCues.push(visemeForWord(wordAt(text, charIndex)), performance.now() / 1000),
    });
    active.current = { id: event.id, handle };
    handle.done.then((result) => {
      if (active.current?.handle !== handle) return; // replaced or stopped meanwhile
      active.current = null;
      setSpeaking(false);
      if (result.status === "ended") { setError(""); dispatch({ type: "finished", id: event.id }); }
      else if (result.status === "error") {
        // Most often the browser refused to speak without a tap; the student can press Listen to try again.
        setError(result.error === "not-allowed" ? "Tap Listen to hear the tutor." : "The tutor's voice could not start in this browser.");
        dispatch({ type: "pause" });
      }
    });
    return undefined;
  }, [player.status, player.index, player.events, voice, rate]);

  // The voice stops when the lesson screen goes away.
  useEffect(() => () => { speech.cancel(); }, []);

  const play = useCallback((events) => { setError(""); dispatch({ type: "load", events }); }, []);
  const stop = useCallback(() => { active.current?.handle.cancel(); active.current = null; setSpeaking(false); dispatch({ type: "skipAll" }); }, []);
  const controls = useMemo(() => ({
    play, stop,
    pause: () => dispatch({ type: "pause" }),
    resume: () => { setError(""); dispatch({ type: "resume" }); },
    next: () => dispatch({ type: "next" }),
    previous: () => dispatch({ type: "previous" }),
    replay: () => { setError(""); dispatch({ type: "replay" }); },
  }), [play, stop]);

  const playing = player.status === "playing" || player.status === "paused";
  return { supported: speech.supported, voices, voice, player, event: playing ? currentEvent(player) : null, speaking: speaking && player.status === "playing", error, controls };
}
