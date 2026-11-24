// The server voice (Premium 3D tutor). Same shape as the browser voice in speechOutput.js, so lesson code treats them alike:
//   speak(text, { rate, ctx, onStart, onLevel }) returns { done, pause, resume, cancel }
// The text is read in short pieces. The next piece is fetched while the current one plays, so there is no gap.
// `done` resolves once with { status: "ended" | "cancelled" | "error", error?, httpStatus?, consumed }, where `consumed` is how
// many characters of the text were fully spoken, so another voice can carry on from there if this one fails.
// Real audio is measured with a Web Audio analyser and reported through onLevel (0 to 1) to drive the mouth.
import { splitSentences } from "./speakable.js";
import { clampRate } from "./speechOutput.js";

/** A level from 0 to 1 for a block of samples (bytes centred on 128, as getByteTimeDomainData gives). */
export function levelFromSamples(samples) {
  if (!samples || !samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) { const v = (samples[i] - 128) / 128; sum += v * v; }
  return Math.min(1, Math.sqrt(sum / samples.length) * 3.2);
}

/**
 * @param {object} deps
 * @param {(text: string, ctx: object) => Promise<Blob>} deps.fetchAudio  asks the server for the audio of one piece
 * @param {number} [deps.maxChars]  longest piece to ask for
 * @param {object} [deps.env]       Audio, URL, AudioContext, requestAnimationFrame (replaceable in tests)
 */
export function createServerSpeech({ fetchAudio, maxChars = 200, env = globalThis } = {}) {
  const supported = typeof fetchAudio === "function" && typeof env.Audio === "function" && typeof env.URL?.createObjectURL === "function";
  let audioContext = null;

  function context() {
    if (audioContext || typeof env.AudioContext !== "function") return audioContext;
    try { audioContext = new env.AudioContext(); } catch { audioContext = null; }
    return audioContext;
  }

  function speak(text, options = {}) {
    let resolveDone;
    const done = new Promise((resolve) => { resolveDone = resolve; });
    const chunks = splitSentences(text, maxChars);
    if (!supported || !chunks.length) {
      resolveDone(supported ? { status: "ended", consumed: String(text ?? "").length } : { status: "error", error: "unsupported", consumed: 0 });
      return { done, pause() {}, resume() {}, cancel() {} };
    }
    const ends = []; // where each piece ends in `text`
    let from = 0;
    for (const chunk of chunks) { const at = text.indexOf(chunk, from); const start = at < 0 ? from : at; from = start + chunk.length; ends.push(from); }

    let index = 0;
    let state = "speaking";
    let current = null; // { audio, url, stopLevel }
    let started = false;
    const requests = new Map();
    const request = (i) => {
      if (i >= chunks.length) return null;
      if (!requests.has(i)) requests.set(i, Promise.resolve().then(() => fetchAudio(chunks[i], options.ctx ?? {})));
      const p = requests.get(i);
      p.catch(() => {}); // a prefetch nobody awaited yet must not become an unhandled rejection
      return p;
    };
    const release = () => {
      if (!current) return;
      current.stopLevel?.();
      try { current.audio.pause(); } catch { /* already stopped */ }
      try { env.URL.revokeObjectURL(current.url); } catch { /* already released */ }
      current = null;
      options.onLevel?.(0);
    };
    const finish = (result) => {
      if (state === "finished") return;
      state = "finished";
      release();
      resolveDone({ consumed: index > 0 ? ends[index - 1] : 0, ...result });
    };
    const watchLevel = (audio) => {
      const ctx = options.onLevel ? context() : null;
      if (!ctx || typeof ctx.createMediaElementSource !== "function") return undefined;
      try {
        ctx.resume?.();
        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        const samples = new Uint8Array(analyser.fftSize);
        const raf = env.requestAnimationFrame ?? ((fn) => setTimeout(fn, 33));
        const caf = env.cancelAnimationFrame ?? clearTimeout;
        let handle = 0;
        let running = true;
        const tick = () => {
          if (!running) return;
          analyser.getByteTimeDomainData(samples);
          options.onLevel(levelFromSamples(samples));
          handle = raf(tick);
        };
        tick();
        return () => { running = false; caf(handle); };
      } catch { return undefined; }
    };
    const playNext = async () => {
      if (state !== "speaking") return;
      if (index >= chunks.length) { finish({ status: "ended" }); return; }
      const mine = index;
      let blob;
      try { blob = await request(mine); } catch (error) {
        if (state === "speaking") finish({ status: "error", error: "server", httpStatus: error?.status });
        return;
      }
      request(mine + 1); // fetch the next piece while this one plays
      if (state !== "speaking" || index !== mine) return;
      const url = env.URL.createObjectURL(blob);
      const audio = new env.Audio(url);
      audio.playbackRate = clampRate(options.rate);
      if ("preservesPitch" in audio) audio.preservesPitch = true;
      current = { audio, url, stopLevel: null };
      audio.onended = () => { if (current?.audio !== audio) return; release(); index += 1; playNext(); };
      audio.onerror = () => { if (current?.audio === audio) finish({ status: "error", error: "playback" }); };
      try {
        await audio.play();
        if (current?.audio !== audio) return;
        current.stopLevel = watchLevel(audio) ?? null;
        if (!started) { started = true; options.onStart?.(); }
      } catch (error) {
        if (current?.audio === audio && state !== "finished") finish({ status: "error", error: error?.name === "NotAllowedError" ? "not-allowed" : "playback" });
      }
    };
    const handle = {
      done,
      pause() { if (state !== "speaking") return; state = "paused"; current?.audio.pause(); },
      resume() { if (state !== "paused") return; state = "speaking"; if (current) current.audio.play().catch(() => finish({ status: "error", error: "playback" })); else playNext(); },
      cancel() { finish({ status: "cancelled" }); },
    };
    playNext();
    return handle;
  }

  return { supported, speak, cancel() {} };
}
