// Chooses between the server voice and the browser voice for each piece of speech, and keeps the lesson going when the
// server voice cannot help. Same shape as both of them: speak(text, options) returns { done, pause, resume, cancel }.
//
// A piece is spoken by the server voice only when the caller passes `options.server` (the lesson, the tutor's voice and so on).
// If the server voice fails, the browser voice reads the rest of the text. If the account is not allowed or the allowance is
// used up (403, 429, 503), the server voice is switched off until `reset()`, so the lesson does not keep asking.

const STOP_FOR_GOOD = new Set([403, 429, 503]);

export function createVoiceEngine({ browser, server }) {
  let disabled = false;
  let active = null;

  function speak(text, options = {}) {
    active?.cancel();
    const wantsServer = !!options.server && !disabled && !!server?.supported;
    if (!wantsServer) { const handle = browser.speak(text, options); active = handle; return handle; }

    let resolveDone;
    const done = new Promise((resolve) => { resolveDone = resolve; });
    let current = server.speak(text, { ...options, ctx: options.server });
    let cancelled = false;
    const handle = {
      done,
      pause() { current.pause(); },
      resume() { current.resume(); },
      cancel() { cancelled = true; current.cancel(); },
    };
    active = handle;
    current.done.then((result) => {
      if (cancelled || result.status !== "error") { resolveDone(result); return; }
      if (STOP_FOR_GOOD.has(result.httpStatus)) disabled = true;
      options.onFallback?.({ reason: result.httpStatus ?? result.error, permanent: STOP_FOR_GOOD.has(result.httpStatus) });
      // Carry on with the browser voice from where the server voice stopped.
      const rest = String(text).slice(result.consumed ?? 0).trim();
      if (!rest) { resolveDone({ status: "ended" }); return; }
      current = browser.speak(rest, { ...options, onStart: undefined });
      current.done.then(resolveDone);
    });
    return handle;
  }

  return {
    get supported() { return browser.supported || !!server?.supported; },
    speak,
    cancel() { active?.cancel(); },
    voices: () => browser.voices(),
    onVoicesChanged: (callback) => browser.onVoicesChanged(callback),
    /** Whether the server voice is currently allowed to be tried. */
    serverAvailable: () => !!server?.supported && !disabled,
    reset() { disabled = false; },
  };
}
