import test from "node:test";
import assert from "node:assert/strict";
import { createServerSpeech, levelFromSamples } from "./serverSpeech.js";

// A tiny stand-in for the browser: audio that "plays" until the test ends it.
function fakeEnv() {
  const log = { created: [], revoked: [], played: [] };
  class FakeAudio {
    constructor(url) { this.url = url; this.paused = true; this.playbackRate = 1; log.created.push(this); }
    play() { this.paused = false; log.played.push(this.url); return Promise.resolve(); }
    pause() { this.paused = true; }
    end() { this.paused = true; this.onended?.(); }
  }
  const env = { Audio: FakeAudio, URL: { createObjectURL: (b) => `blob:${b}`, revokeObjectURL: (u) => log.revoked.push(u) } };
  return { env, log };
}
const tick = () => new Promise((r) => setTimeout(r, 0));
const flush = async () => { for (let i = 0; i < 5; i += 1) await tick(); };

test("reads pieces in order, fetching the next while one plays", async () => {
  const { env, log } = fakeEnv();
  const asked = [];
  const voice = createServerSpeech({ env, fetchAudio: async (text) => { asked.push(text); return text; } });
  let started = 0;
  const handle = voice.speak("First one. Second one. Third one.", { rate: 1.25, onStart: () => { started += 1; } });
  await flush();
  assert.deepEqual(asked, ["First one.", "Second one."]); // the second is already being fetched
  assert.equal(started, 1);
  assert.equal(log.created[0].playbackRate, 1.25);
  log.created[0].end(); await flush();
  log.created[1].end(); await flush();
  log.created[2].end();
  const result = await handle.done;
  assert.equal(result.status, "ended");
  assert.equal(result.consumed, "First one. Second one. Third one.".length);
  assert.deepEqual(asked, ["First one.", "Second one.", "Third one."]);
  assert.equal(log.revoked.length, 3);
  assert.equal(started, 1);
});

test("a failed first piece ends with an error and nothing consumed", async () => {
  const { env } = fakeEnv();
  const voice = createServerSpeech({ env, fetchAudio: async () => { throw Object.assign(new Error("x"), { status: 429 }); } });
  const result = await voice.speak("Hello there. More.").done;
  assert.deepEqual(result, { consumed: 0, status: "error", error: "server", httpStatus: 429 });
});

test("a failure on a later piece reports how much was spoken", async () => {
  const { env, log } = fakeEnv();
  let n = 0;
  const voice = createServerSpeech({ env, fetchAudio: async (t) => { n += 1; if (n === 2) throw Object.assign(new Error("x"), { status: 502 }); return t; } });
  const handle = voice.speak("One. Two. Three.");
  await flush();
  log.created[0].end();
  const result = await handle.done;
  assert.equal(result.status, "error");
  assert.equal(result.httpStatus, 502);
  assert.equal(result.consumed, "One.".length);
});

test("pause stops the sound and resume carries on from the same place", async () => {
  const { env, log } = fakeEnv();
  const voice = createServerSpeech({ env, fetchAudio: async (t) => t });
  const handle = voice.speak("One. Two.");
  await flush();
  handle.pause();
  assert.equal(log.created[0].paused, true);
  handle.resume(); await flush();
  assert.equal(log.created[0].paused, false);
  assert.equal(log.played.length, 2); // played, then played again (not restarted as a new piece)
  assert.equal(log.created.length, 1);
});

test("cancel stops, frees the audio and resolves once as cancelled", async () => {
  const { env, log } = fakeEnv();
  const voice = createServerSpeech({ env, fetchAudio: async (t) => t });
  const handle = voice.speak("One. Two.");
  await flush();
  handle.cancel();
  handle.cancel();
  const result = await handle.done;
  assert.equal(result.status, "cancelled");
  assert.deepEqual(log.revoked, ["blob:One."]);
  log.created[0].end(); await flush();
  assert.equal(log.created.length, 1); // nothing carries on after a cancel
});

test("a browser that blocks sound until a tap reports not-allowed", async () => {
  const { env } = fakeEnv();
  env.Audio.prototype.play = () => Promise.reject(Object.assign(new Error("blocked"), { name: "NotAllowedError" }));
  const result = await createServerSpeech({ env, fetchAudio: async (t) => t }).speak("Hello.").done;
  assert.equal(result.error, "not-allowed");
});

test("unsupported when there is no Audio or no fetcher", async () => {
  assert.equal(createServerSpeech({ env: {}, fetchAudio: async () => "" }).supported, false);
  assert.equal(createServerSpeech({ env: fakeEnv().env }).supported, false);
  const result = await createServerSpeech({ env: {} }).speak("Hello.").done;
  assert.equal(result.status, "error");
});

test("levelFromSamples is zero for silence and rises with loudness", () => {
  assert.equal(levelFromSamples(new Uint8Array(64).fill(128)), 0);
  const loud = new Uint8Array(64).map((_, i) => (i % 2 ? 228 : 28));
  assert.ok(levelFromSamples(loud) > 0.9);
  const soft = new Uint8Array(64).map((_, i) => (i % 2 ? 138 : 118));
  assert.ok(levelFromSamples(soft) > 0 && levelFromSamples(soft) < 0.4);
  assert.equal(levelFromSamples(null), 0);
});
