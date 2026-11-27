import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// App.jsx is edited by many branches at once and merges have silently dropped lines from it before.
// These checks fail loudly if a page loses its route or the toast and confirm provider stops being mounted.
const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");

test("every page the app links to has a route", () => {
  for (const path of ["/settings", "/unsubscribe", "/about", "/privacy", "/terms", "/practice", "/classroom/learning", "/study-plan", "/premium", "/flashcards"]) {
    assert.ok(app.includes(`path="${path}"`), `missing route ${path}`);
  }
});

test("settings needs sign-in; unsubscribe, about, privacy and terms are public", () => {
  assert.match(app, /path="\/settings" element=\{<ProtectedRoute>/);
  for (const path of ["/unsubscribe", "/about", "/privacy", "/terms"]) {
    const line = app.split("\n").find((l) => l.includes(`path="${path}"`)) || "";
    assert.ok(!line.includes("ProtectedRoute"), `${path} must be public`);
  }
});

test("the toast and confirm provider wraps the routes", () => {
  assert.match(app, /<FeedbackProvider>/);
  assert.ok(app.indexOf("<FeedbackProvider>") < app.indexOf("<Routes>"), "FeedbackProvider must be above Routes");
  assert.ok(app.indexOf("</FeedbackProvider>") > app.indexOf("</Routes>"), "FeedbackProvider must close after Routes");
});

test("the share image the page points to exists", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const file = /og:image" content="https:\/\/unilib\.com\.ng\/([^"]+)"/.exec(html)?.[1];
  assert.ok(file, "index.html has no og:image");
  assert.doesNotThrow(() => readFileSync(new URL(`../public/${file}`, import.meta.url)), `public/${file} is missing`);
});
