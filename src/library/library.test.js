import test from "node:test";
import assert from "node:assert/strict";
import { KINDS, readOpened, rememberOpened } from "./lastOpened.js";
import { daysToExam, examLabel, lessonCandidate, localCandidates, pickContinue } from "./continueView.js";
import { dueByDeck, dueHeadline, streakText, topDueDeck } from "./studySummary.js";

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) }; };
const NOW = new Date("2026-11-20T10:00:00").getTime();

test("lastOpened: remembers per account and kind, newest first", () => {
  const s = memory();
  rememberOpened(s, "u1", "material", { id: "m1", title: "Thermo", page: 7 }, NOW - 1000);
  rememberOpened(s, "u1", "deck", { id: "d1", title: "Algebra" }, NOW);
  rememberOpened(s, "u2", "deck", { id: "d9", title: "Other person" }, NOW);
  const r = readOpened(s, "u1", NOW);
  assert.deepEqual(r.map((e) => e.kind), ["deck", "material"]);
  assert.equal(r[1].page, 7);
  assert.equal(readOpened(s, "u2", NOW).length, 1);
  assert.deepEqual(readOpened(s, "nobody", NOW), []);
});

test("lastOpened: overwrites the same kind, expires after 30 days, ignores junk and blocked storage", () => {
  const s = memory();
  rememberOpened(s, "u1", "material", { id: "m1", title: "A" }, NOW);
  rememberOpened(s, "u1", "material", { id: "m2", title: "B" }, NOW + 5);
  assert.equal(readOpened(s, "u1", NOW + 10)[0].id, "m2");
  assert.equal(readOpened(s, "u1", NOW + 31 * 86400000).length, 0);
  rememberOpened(s, "u1", "weird", { id: "x", title: "x" }, NOW);
  rememberOpened(s, "u1", "deck", { id: "", title: "x" }, NOW);
  rememberOpened(s, "", "deck", { id: "x", title: "x" }, NOW);
  assert.equal(readOpened(s, "u1", NOW + 10).length, 1);
  const bad = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.doesNotThrow(() => rememberOpened(bad, "u1", "deck", { id: "d", title: "t" }));
  assert.deepEqual(readOpened(bad, "u1"), []);
  assert.deepEqual(readOpened(memory(), "u1"), []);
  const corrupt = { getItem: () => "{not json", setItem: () => {} };
  assert.deepEqual(readOpened(corrupt, "u1"), []);
  assert.ok(KINDS.includes("deck"));
});

test("daysToExam counts calendar days and handles bad input", () => {
  const now = new Date("2026-11-20T23:30:00");
  assert.equal(daysToExam("2026-11-20T00:00:00", now), 0);
  assert.equal(daysToExam("2026-11-21T08:00:00", now), 1);
  assert.equal(daysToExam("2026-12-20T08:00:00", now), 30);
  assert.equal(daysToExam("2026-11-19T08:00:00", now), -1);
  assert.equal(daysToExam(null, now), null);
  assert.equal(daysToExam("garbage", now), null);
});

test("examLabel wording", () => {
  assert.equal(examLabel(null), null);
  assert.equal(examLabel(-3), "Exam date has passed");
  assert.equal(examLabel(0), "Exam is today");
  assert.equal(examLabel(1), "1 day to your exam");
  assert.equal(examLabel(12), "12 days to your exam");
});

test("lessonCandidate picks the newest live lesson with its step", () => {
  const sessions = [
    { id: "a", title: "Old", mode: "CONVERSATION", updatedAt: "2026-11-01T00:00:00Z" },
    { id: "b", title: "Thermo", mode: "CLASSROOM", outline: [{ title: "x" }, { title: "y" }, { title: "z" }], currentStepIndex: 1, updatedAt: "2026-11-19T00:00:00Z" },
    { id: "c", title: "Deleting", status: "DELETING", updatedAt: "2026-11-20T00:00:00Z" },
  ];
  const c = lessonCandidate(sessions);
  assert.equal(c.href, "/classroom/b");
  assert.match(c.detail, /^Step \d of 3$/);
  assert.equal(lessonCandidate([]), null);
  assert.equal(lessonCandidate(undefined), null);
});

test("pickContinue chooses the most recent across sources; links are built safely", () => {
  const local = localCandidates([{ kind: "material", id: "a b&c", title: "T", page: 3, at: NOW }, { kind: "deck", id: "d1", title: "D", at: NOW - 5 }]);
  assert.equal(local[0].href, "/study-material?open=a%20b%26c&page=3");
  assert.equal(local[1].href, "/flashcards?deck=d1");
  const lesson = { kind: "lesson", title: "L", href: "/classroom/x", detail: "", at: NOW + 100 };
  assert.equal(pickContinue([...local, lesson]).kind, "lesson");
  assert.equal(pickContinue([...local, null])?.kind, "material");
  assert.equal(pickContinue([null]), null);
});

test("study summary wording and helpers", () => {
  assert.equal(dueHeadline(null), null);
  assert.equal(dueHeadline({ dueToday: 0, reviewedToday: true }), "All caught up for today");
  assert.equal(dueHeadline({ dueToday: 0, reviewedToday: false }), "Nothing due right now");
  assert.equal(dueHeadline({ dueToday: 1 }), "1 card due today");
  assert.equal(dueHeadline({ dueToday: 14 }), "14 cards due today");
  assert.equal(streakText({ streak: 0 }), null);
  assert.equal(streakText({ streak: 1, reviewedToday: true }), "1 day review streak");
  assert.match(streakText({ streak: 4, reviewedToday: false }), /keep it/);
  const s = { dueToday: 5, decks: [{ deckId: "a", title: "A", due: 2 }, { deckId: "b", title: "B", due: 3 }] };
  assert.equal(dueByDeck(s).get("b"), 3);
  assert.equal(topDueDeck(s).deckId, "b");
  assert.equal(topDueDeck({ decks: [{ deckId: "a", due: 0 }] }), null);
  assert.equal(topDueDeck(undefined), null);
});
