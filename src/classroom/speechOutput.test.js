import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampRate, createBrowserSpeech, guessGender, pickVoice } from "./speechOutput.js";

// A fake speech engine: it records what was spoken and lets the test finish or fail each utterance.
function fakeEnv({ voices = [] } = {}) {
  const spoken = [];
  const synth = {
    cancelled: 0,
    speak(u) { spoken.push(u); },
    cancel() { this.cancelled += 1; },
    getVoices: () => voices,
    listeners: {},
    addEventListener(name, fn) { this.listeners[name] = fn; },
    removeEventListener(name) { delete this.listeners[name]; },
  };
  class Utterance { constructor(text) { this.text = text; } }
  return { env: { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance }, spoken, synth };
}
const tick = () => new Promise((resolve) => globalThis.setTimeout(resolve, 0));

describe("guessGender and pickVoice", () => {
  it("guesses from the voice name and admits when it cannot", () => {
    assert.equal(guessGender("Google UK English Female"), "FEMALE");
    assert.equal(guessGender("Google UK English Male"), "MALE");
    assert.equal(guessGender("Microsoft Zira"), "FEMALE");
    assert.equal(guessGender("Microsoft David"), "MALE");
    assert.equal(guessGender("Mystery"), "");
  });

  const voices = [
    { name: "Microsoft Hazel", lang: "en-GB", localService: true },
    { name: "Microsoft David", lang: "en-US", localService: true },
    { name: "Google UK English Female", lang: "en-GB", localService: false },
    { name: "Amélie", lang: "fr-CA", localService: true },
  ];

  it("uses the named voice when installed", () => assert.equal(pickVoice(voices, { name: "Microsoft David" }).name, "Microsoft David"));

  it("prefers a local English voice of the wanted gender and never a non-English one", () => {
    assert.equal(pickVoice(voices, { gender: "FEMALE" }).name, "Microsoft Hazel");
    assert.equal(pickVoice(voices, { gender: "MALE" }).name, "Microsoft David");
    assert.equal(pickVoice([voices[3]], {}), null);
  });

  it("prefers a voice installed on the device over a network voice of the same kind", () => {
    const pair = [{ name: "Network Voice", lang: "en-GB", localService: false }, { name: "Local Voice", lang: "en-GB", localService: true }];
    assert.equal(pickVoice(pair, {}).name, "Local Voice");
  });

  it("falls back from a missing name and copes with bad lists", () => {
    assert.equal(pickVoice(voices, { name: "Gone", gender: "MALE" }).name, "Microsoft David");
    for (const bad of [null, undefined, [], [null, {}]]) assert.equal(pickVoice(bad, { gender: "FEMALE" }), null);
  });
});

describe("clampRate", () => {
  it("keeps the rate in range and recovers from bad numbers", () => {
    assert.equal(clampRate(0.1), 0.5);
    assert.equal(clampRate(5), 2);
    for (const bad of [NaN, undefined, "2", null]) assert.equal(clampRate(bad), 1);
  });
});

describe("createBrowserSpeech", () => {
  it("reports unsupported browsers and resolves with an error instead of throwing", async () => {
    const speech = createBrowserSpeech({});
    assert.equal(speech.supported, false);
    assert.deepEqual(speech.voices(), []);
    const handle = speech.speak("hello");
    assert.deepEqual(await handle.done, { status: "error", error: "unsupported" });
  });

  it("speaks sentence by sentence, in order, and ends after the last", async () => {
    const { env, spoken } = fakeEnv();
    const speech = createBrowserSpeech(env);
    let started = 0;
    const handle = speech.speak("One. Two. Three.", { onStart: () => { started += 1; }, rate: 1.25 });
    assert.deepEqual(spoken.map((u) => u.text), ["One."]);
    assert.equal(spoken[0].rate, 1.25);
    spoken[0].onstart(); spoken[0].onend();
    assert.deepEqual(spoken.map((u) => u.text), ["One.", "Two."]);
    spoken[1].onstart(); spoken[1].onend();
    spoken[2].onend();
    assert.deepEqual(await handle.done, { status: "ended" });
    assert.equal(started, 1);
  });

  it("maps word positions back to the whole text", async () => {
    const { env, spoken } = fakeEnv();
    const positions = [];
    createBrowserSpeech(env).speak("Hello there. Next one.", { onBoundary: (e) => positions.push(e.charIndex) });
    spoken[0].onboundary({ charIndex: 6 });
    spoken[0].onend();
    spoken[1].onboundary({ charIndex: 5 });
    assert.deepEqual(positions, [6, 18]);
  });

  it("finishes at once when there is nothing to say", async () => {
    const { env, spoken } = fakeEnv();
    assert.deepEqual(await createBrowserSpeech(env).speak("   ").done, { status: "ended" });
    assert.equal(spoken.length, 0);
  });

  it("pause stops the sentence and resume says it again; the paused sentence does not advance", async () => {
    const { env, spoken, synth } = fakeEnv();
    const handle = createBrowserSpeech(env).speak("One. Two.");
    handle.pause();
    assert.equal(synth.cancelled, 1);
    spoken[0].onend(); // the cancelled utterance reports an end; it must be ignored
    assert.equal(spoken.length, 1);
    handle.resume();
    assert.deepEqual(spoken.map((u) => u.text), ["One.", "One."]);
    spoken[1].onend();
    assert.deepEqual(spoken.map((u) => u.text), ["One.", "One.", "Two."]);
    handle.resume(); // resuming while speaking does nothing
    assert.equal(spoken.length, 3);
  });

  it("ignores the late end of an utterance that was stopped by pause, even after resume", () => {
    const { env, spoken } = fakeEnv();
    const handle = createBrowserSpeech(env).speak("One. Two.");
    handle.pause();
    handle.resume();
    assert.equal(spoken.length, 2);
    spoken[0].onend(); // the stopped first utterance reports back late
    assert.equal(spoken.length, 2);
    assert.equal(spoken[1].text, "One.");
  });

  it("cancel resolves once as cancelled and ignores late browser events", async () => {
    const { env, spoken } = fakeEnv();
    const handle = createBrowserSpeech(env).speak("One. Two.");
    handle.cancel();
    handle.cancel();
    assert.deepEqual(await handle.done, { status: "cancelled" });
    spoken[0].onend();
    assert.equal(spoken.length, 1);
  });

  it("starting a new speech cancels the one in progress", async () => {
    const { env } = fakeEnv();
    const speech = createBrowserSpeech(env);
    const first = speech.speak("One. Two.");
    speech.speak("Three.");
    assert.deepEqual(await Promise.race([first.done, new Promise((resolve) => globalThis.setTimeout(() => resolve("still speaking"), 50))]), { status: "cancelled" });
  });

  it("reports real errors but ignores interrupted and cancelled ones", async () => {
    const { env, spoken } = fakeEnv();
    const speech = createBrowserSpeech(env);
    const a = speech.speak("One.");
    spoken[0].onerror({ error: "interrupted" });
    spoken[0].onerror({ error: "canceled" });
    let settled = false;
    a.done.then(() => { settled = true; });
    await tick();
    assert.equal(settled, false);
    spoken[0].onerror({ error: "not-allowed" });
    assert.deepEqual(await a.done, { status: "error", error: "not-allowed" });
  });

  it("lists voices and subscribes to changes", () => {
    const voices = [{ name: "A", lang: "en-US" }];
    const { env, synth } = fakeEnv({ voices });
    const speech = createBrowserSpeech(env);
    assert.deepEqual(speech.voices(), voices);
    let calls = 0;
    const off = speech.onVoicesChanged(() => { calls += 1; });
    synth.listeners.voiceschanged();
    assert.equal(calls, 1);
    off();
    assert.equal(synth.listeners.voiceschanged, undefined);
  });
});
