import test from "node:test";
import assert from "node:assert/strict";
import { embedUrl, emptyMessage, formatDuration, isVideoId, planNote, readVideos, thumbUrl } from "./videoView.js";

test("duration formatting", () => {
  assert.equal(formatDuration(125), "2:05");
  assert.equal(formatDuration(3849), "1:04:09");
  assert.equal(formatDuration(undefined), "0:00");
});

test("only real video ids produce urls", () => {
  assert.equal(isVideoId("dQw4w9WgXcQ"), true);
  assert.equal(isVideoId("dQw4w9WgXcQ\"><script>"), false);
  assert.equal(embedUrl("../evil"), null);
  assert.equal(thumbUrl("short"), null);
  assert.match(embedUrl("dQw4w9WgXcQ"), /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/);
});

test("server replies are cleaned", () => {
  const out = readVideos({ videos: [{ videoId: "dQw4w9WgXcQ", title: "A", channel: "B", durationSeconds: 60 }, { videoId: "bad" }, null] });
  assert.equal(out.length, 1);
  assert.deepEqual(readVideos(undefined), []);
});

test("empty messages say what to do", () => {
  assert.equal(emptyMessage({ reason: "LIMIT_REACHED", tier: "FREE" }).upgrade, true);
  assert.equal(emptyMessage({ reason: "LIMIT_REACHED", tier: "PREMIUM" }).upgrade, false);
  assert.match(emptyMessage({ reason: "BUSY" }).text, /try again/i);
  assert.match(emptyMessage({ reason: "NONE" }).text, /did not find/i);
});

test("plan note", () => {
  assert.match(planNote({ tier: "FREE", perStep: 1, lookupsRemaining: 2 }), /Free plan: 1 video per step.*2 video lookups left/);
  assert.equal(planNote({ tier: "PREMIUM", perStep: 5, lookupsRemaining: 1 }), "1 video lookup left today.");
  assert.equal(planNote(null), "");
});
