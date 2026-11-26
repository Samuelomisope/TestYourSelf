import test from "node:test";
import assert from "node:assert/strict";
import { createVisitReporter, featureForPath, SESSION_GAP_MS } from "./featureVisits.js";

test("maps pages to sections and ignores pages that are not counted", () => {
  const cases = {
    "/home": "home", "/study-material": "library", "/search": "search", "/practice": "practice", "/flashcards": "flashcards",
    "/ai": "ai_tools", "/classroom": "classroom", "/classroom/learning": "classroom", "/classroom/3f2a": "classroom",
    "/marketplace/create": "marketplace", "/marketplace/seller/12": "marketplace", "/novels/5": "novels", "/episodes/9": "novels",
    "/writer/dashboard": "novels", "/schools/futa": "schools", "/premium": "premium", "/profile": "profile", "/settings": "settings",
    "/study-plan": "study_plan", "/chat": "chat", "/feedback": "feedback",
  };
  for (const [path, key] of Object.entries(cases)) assert.equal(featureForPath(path), key, path);
  for (const path of ["/", "/admin", "/privacy", "/terms", "/unsubscribe", "/nope", "", null, undefined, "/homework", "/airplane", "/practices"]) assert.equal(featureForPath(path), null, String(path));
});

test("every section the app can report is one the server accepts", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(fileURLToPath(new URL("./featureVisits.js", import.meta.url)), "utf8");
  const reported = [...source.matchAll(/\/, "(\w+)"\],/g)].map((m) => m[1]);
  const accepted = ["home", "library", "search", "practice", "flashcards", "ai_tools", "classroom", "study_plan", "chat", "marketplace", "novels", "schools", "premium", "profile", "settings", "feedback"]; // the list in the backend's feature-keys.ts
  assert.ok(reported.length >= 16);
  for (const key of reported) assert.ok(accepted.includes(key), key);
});

test("moving inside one section counts once; another section counts again", () => {
  const sent = []; let t = 0;
  const reporter = createVisitReporter({ send: (f) => sent.push(f), now: () => t });
  assert.equal(reporter.visit("/marketplace"), true);
  t += 1000; assert.equal(reporter.visit("/marketplace/42"), false);
  t += 1000; assert.equal(reporter.visit("/marketplace/my-listings"), false);
  t += 1000; assert.equal(reporter.visit("/flashcards"), true);
  t += 1000; assert.equal(reporter.visit("/marketplace"), true);
  assert.deepEqual(sent, ["marketplace", "flashcards", "marketplace"]);
});

test("coming back to a section after a long quiet gap counts as a new visit", () => {
  const sent = []; let t = 0;
  const reporter = createVisitReporter({ send: (f) => sent.push(f), now: () => t });
  reporter.visit("/chat");
  t += SESSION_GAP_MS - 1; assert.equal(reporter.visit("/chat"), false);
  t += SESSION_GAP_MS - 1; assert.equal(reporter.visit("/chat"), false); // the gap is measured from the latest page
  t += SESSION_GAP_MS; assert.equal(reporter.visit("/chat"), true);
  assert.equal(sent.length, 2);
});

test("uncounted pages send nothing, do not reset the section, and a failing sender never throws", () => {
  const sent = []; let t = 0;
  const reporter = createVisitReporter({ send: (f) => sent.push(f), now: () => t });
  reporter.visit("/ai"); t += 10; assert.equal(reporter.visit("/privacy"), false); t += 10; assert.equal(reporter.visit("/ai"), false);
  assert.deepEqual(sent, ["ai_tools"]);
  const broken = createVisitReporter({ send: () => { throw new Error("offline"); } });
  assert.doesNotThrow(() => broken.visit("/home"));
});

test("reset forgets the last section, so signing in again counts the first page", () => {
  const sent = [];
  const reporter = createVisitReporter({ send: (f) => sent.push(f) });
  reporter.visit("/home"); reporter.reset(); reporter.visit("/home");
  assert.equal(sent.length, 2);
});
