import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_VOICE_PREFS, loadVoicePrefs, sanitizeVoicePrefs, saveVoicePrefs, VOICE_KEY } from "./voicePrefs.js";

const memory = (initial = {}) => { const data = { ...initial }; return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; } }; };

describe("voice preferences", () => {
  it("defaults to off at normal speed", () => assert.deepEqual(loadVoicePrefs(memory()), DEFAULT_VOICE_PREFS));

  it("saves and reloads valid settings", () => {
    const storage = memory();
    assert.equal(saveVoicePrefs(storage, { autoSpeak: true, rate: 1.25, voiceName: "Hazel", showTutor: false, tutorView: "3d" }), true);
    assert.deepEqual(loadVoicePrefs(storage), { autoSpeak: true, rate: 1.25, voiceName: "Hazel", showTutor: false, tutorView: "3d" });
  });

  it("repairs damaged values instead of trusting them", () => {
    assert.deepEqual(sanitizeVoicePrefs({ autoSpeak: "yes", rate: 9, voiceName: 5, showTutor: "no", tutorView: "holo" }), DEFAULT_VOICE_PREFS); // only an explicit false hides the tutor
    assert.equal(sanitizeVoicePrefs({ voiceName: "x".repeat(500) }).voiceName.length, 200);
    for (const bad of [null, undefined, "x", 5, []]) assert.deepEqual(sanitizeVoicePrefs(bad), DEFAULT_VOICE_PREFS);
  });

  it("survives broken JSON, missing storage and a storage that throws", () => {
    assert.deepEqual(loadVoicePrefs(memory({ [VOICE_KEY]: "{not json" })), DEFAULT_VOICE_PREFS);
    assert.deepEqual(loadVoicePrefs(undefined), DEFAULT_VOICE_PREFS);
    const throwing = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("full"); } };
    assert.deepEqual(loadVoicePrefs(throwing), DEFAULT_VOICE_PREFS);
    assert.equal(saveVoicePrefs(throwing, DEFAULT_VOICE_PREFS), false);
    assert.equal(saveVoicePrefs(undefined, DEFAULT_VOICE_PREFS), false);
  });
});
