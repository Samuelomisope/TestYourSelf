import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appendDictation, assembleTranscript, createBrowserRecognition, describeRecognitionError } from "./speechInput.js";

const result = (transcript, isFinal) => Object.assign([{ transcript }], { isFinal });

describe("assembleTranscript", () => {
  it("separates settled words from words still being heard", () => {
    assert.deepEqual(assembleTranscript([result("what is  a ", true), result("limit", false)]), { final: "what is a", interim: "limit" });
  });
  it("copes with empty, odd and missing results", () => {
    for (const bad of [null, undefined, [], [null], [[]], [{}], [[{ transcript: 5 }]]]) assert.deepEqual(assembleTranscript(bad), { final: "", interim: "" });
  });
});

describe("describeRecognitionError", () => {
  it("is silent when the student stopped it and plain otherwise", () => {
    assert.equal(describeRecognitionError("aborted"), "");
    assert.match(describeRecognitionError("not-allowed"), /microphone is blocked/i);
    assert.equal(describeRecognitionError("service-not-allowed"), describeRecognitionError("not-allowed"));
    assert.match(describeRecognitionError("no-speech"), /didn't hear/i);
    assert.match(describeRecognitionError("audio-capture"), /No microphone/);
    assert.match(describeRecognitionError("network"), /internet/);
    assert.match(describeRecognitionError("whatever"), /type your question/);
  });
});

describe("appendDictation", () => {
  it("adds heard words after what is typed, with one space", () => {
    assert.equal(appendDictation("", "hello"), "hello");
    assert.equal(appendDictation("What is ", "a limit"), "What is a limit");
    assert.equal(appendDictation("typed", "   "), "typed");
    assert.equal(appendDictation(null, "hi"), "hi");
  });
});

function fakeRecognition() {
  const made = [];
  class Recognition {
    constructor() { made.push(this); this.calls = []; }
    start() { this.calls.push("start"); if (Recognition.failStart) throw new Error("already started"); }
    stop() { this.calls.push("stop"); }
    abort() { this.calls.push("abort"); }
  }
  return { env: { webkitSpeechRecognition: Recognition }, made, Recognition };
}

describe("createBrowserRecognition", () => {
  it("reports unsupported browsers without throwing", () => {
    const input = createBrowserRecognition({});
    assert.equal(input.supported, false);
    let ended;
    input.start({ onEnd: (e) => { ended = e; } });
    assert.deepEqual(ended, { error: "unsupported" });
  });

  it("delivers interim then final text once and ends once", () => {
    const { env, made } = fakeRecognition();
    const heard = { interim: [], final: [], ended: [] };
    createBrowserRecognition(env).start({ onInterim: (t) => heard.interim.push(t), onFinal: (t) => heard.final.push(t), onEnd: (e) => heard.ended.push(e) });
    const r = made[0];
    assert.equal(r.interimResults, true);
    assert.equal(r.continuous, false);
    assert.equal(r.lang, "en-NG");
    r.onresult({ results: [result("what is", false)] });
    r.onresult({ results: [result("what is a limit", true)] });
    r.onresult({ results: [result("what is a limit", true)] }); // a repeated final is not delivered twice
    r.onend(); r.onend();
    assert.deepEqual(heard, { interim: ["what is"], final: ["what is a limit"], ended: [{ error: "" }] });
  });

  it("reports the error code when listening ends", () => {
    const { env, made } = fakeRecognition();
    let ended;
    createBrowserRecognition(env).start({ onEnd: (e) => { ended = e; } });
    made[0].onerror({ error: "no-speech" });
    made[0].onend();
    assert.deepEqual(ended, { error: "no-speech" });
  });

  it("stop and abort reach the recogniser and starting again aborts the previous one", () => {
    const { env, made } = fakeRecognition();
    const input = createBrowserRecognition(env);
    const first = input.start({});
    first.stop();
    assert.deepEqual(made[0].calls, ["start", "stop"]);
    input.start({});
    assert.deepEqual(made[0].calls, ["start", "stop", "abort"]);
    input.abort();
    assert.deepEqual(made[1].calls, ["start", "abort"]);
  });

  it("ends with an error instead of throwing when the browser refuses to start", () => {
    const { env, Recognition } = fakeRecognition();
    Recognition.failStart = true;
    let ended;
    createBrowserRecognition(env).start({ onEnd: (e) => { ended = e; } });
    assert.deepEqual(ended, { error: "unknown" });
  });
});
