import test from "node:test";
import assert from "node:assert/strict";
import { createVoiceEngine } from "./voiceEngine.js";

function fakeVoice(name, behaviour) {
  const spoken = [];
  const voice = { name, supported: true, spoken, cancelled: 0, speak(text, options) {
    spoken.push({ text, options });
    const result = behaviour(text, spoken.length);
    const handle = { done: Promise.resolve(result), pause() { handle.paused = true; }, resume() { handle.paused = false; }, cancel() { voice.cancelled += 1; } };
    return handle;
  }, voices: () => [], onVoicesChanged: () => () => {} };
  return voice;
}

test("uses the browser voice when the lesson does not ask for the server voice", async () => {
  const browser = fakeVoice("browser", () => ({ status: "ended" }));
  const server = fakeVoice("server", () => ({ status: "ended", consumed: 5 }));
  const engine = createVoiceEngine({ browser, server });
  await engine.speak("Hello there.", {}).done;
  assert.equal(browser.spoken.length, 1);
  assert.equal(server.spoken.length, 0);
});

test("uses the server voice when asked, passing the lesson details", async () => {
  const browser = fakeVoice("browser", () => ({ status: "ended" }));
  const server = fakeVoice("server", (text) => ({ status: "ended", consumed: text.length }));
  const engine = createVoiceEngine({ browser, server });
  const result = await engine.speak("Hello there.", { server: { sessionId: "s1", voice: "male" } }).done;
  assert.equal(result.status, "ended");
  assert.deepEqual(server.spoken[0].options.ctx, { sessionId: "s1", voice: "male" });
  assert.equal(browser.spoken.length, 0);
});

test("on a server failure the browser voice reads only the rest of the text", async () => {
  const browser = fakeVoice("browser", () => ({ status: "ended" }));
  const server = fakeVoice("server", () => ({ status: "error", error: "server", httpStatus: 502, consumed: "One.".length }));
  const engine = createVoiceEngine({ browser, server });
  let note = null;
  const result = await engine.speak("One. Two. Three.", { server: { sessionId: "s", voice: "female" }, onFallback: (n) => { note = n; } }).done;
  assert.equal(result.status, "ended");
  assert.equal(browser.spoken[0].text, "Two. Three.");
  assert.deepEqual(note, { reason: 502, permanent: false });
  assert.equal(engine.serverAvailable(), true); // a passing hiccup does not switch it off
});

test("a 429, 403 or 503 switches the server voice off until reset", async () => {
  for (const code of [429, 403, 503]) {
    const browser = fakeVoice("browser", () => ({ status: "ended" }));
    const server = fakeVoice("server", () => ({ status: "error", error: "server", httpStatus: code, consumed: 0 }));
    const engine = createVoiceEngine({ browser, server });
    await engine.speak("Hello.", { server: { sessionId: "s", voice: "female" } }).done;
    assert.equal(engine.serverAvailable(), false, String(code));
    await engine.speak("Again.", { server: { sessionId: "s", voice: "female" } }).done;
    assert.equal(server.spoken.length, 1, "does not ask again");
    engine.reset();
    assert.equal(engine.serverAvailable(), true);
  }
});

test("a cancelled server voice does not start the browser voice", async () => {
  const browser = fakeVoice("browser", () => ({ status: "ended" }));
  const server = fakeVoice("server", () => ({ status: "cancelled", consumed: 0 }));
  const engine = createVoiceEngine({ browser, server });
  const result = await engine.speak("Hello.", { server: { sessionId: "s", voice: "female" } }).done;
  assert.equal(result.status, "cancelled");
  assert.equal(browser.spoken.length, 0);
});

test("if the server voice failed after the whole text was spoken, nothing more is said", async () => {
  const browser = fakeVoice("browser", () => ({ status: "ended" }));
  const server = fakeVoice("server", () => ({ status: "error", error: "playback", consumed: 6 }));
  const result = await createVoiceEngine({ browser, server }).speak("Hello.", { server: { sessionId: "s", voice: "female" } }).done;
  assert.equal(result.status, "ended");
  assert.equal(browser.spoken.length, 0);
});

test("starting a new piece cancels the one still speaking", () => {
  const browser = fakeVoice("browser", () => ({ status: "ended" }));
  const engine = createVoiceEngine({ browser, server: null });
  engine.speak("One.", {});
  engine.speak("Two.", {});
  assert.equal(browser.cancelled, 1);
  assert.equal(engine.supported, true);
  assert.equal(engine.serverAvailable(), false);
});
