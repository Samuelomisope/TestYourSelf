import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { voiceSupport } from "./voiceSupport.js";

describe("voiceSupport", () => {
  it("needs both a synthesiser and an utterance class to speak", () => {
    assert.deepEqual(voiceSupport({ speechSynthesis: {}, SpeechSynthesisUtterance: class {} }), { speak: true, listen: false });
    assert.equal(voiceSupport({ speechSynthesis: {} }).speak, false);
    assert.equal(voiceSupport({ SpeechSynthesisUtterance: class {} }).speak, false);
  });
  it("finds recognition under either name", () => {
    assert.equal(voiceSupport({ SpeechRecognition: class {} }).listen, true);
    assert.equal(voiceSupport({ webkitSpeechRecognition: class {} }).listen, true);
    assert.equal(voiceSupport({ SpeechRecognition: "no" }).listen, false);
  });
  it("is false everywhere without a browser", () => {
    for (const env of [{}, null, undefined]) assert.deepEqual(voiceSupport(env), { speak: false, listen: false });
  });
});
