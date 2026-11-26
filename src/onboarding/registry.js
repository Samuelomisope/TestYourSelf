import { MARKETPLACE_ENABLED } from "../features.js";
// The one place that says what is new and what the tour covers. Adding a feature later is one entry in FEATURES;
// the menu badge, dot, first-use tip and "What's new" panel all read from it.

export const TOUR_KEY = "tour:v2";
export const LEGACY_TOUR_KEY = "testyourself_tour_seen"; // the old 7-step tour, read once
export const NEW_ACCOUNT_DAYS = 7; // only accounts this young get the tour automatically

/**
 * navId   matches data-tour="tab-<navId>" / "side-<navId>" on the real menu items.
 * addedOn the day it shipped. A feature stops counting as NEW after `newForDays`, even if never opened.
 * href    opening this path (or anything under it) counts as having seen it.
 */
export const FEATURES = [
  {
    key: "feature:classroom",
    navId: "classroom",
    label: "AI Classroom",
    title: "AI Classroom with check-ins and progress",
    description:
      "Learn any topic from your notes with a live AI tutor and whiteboard. Pick up where you left off, answer quick check-ins, and see what to revise in My learning.",
    href: "/classroom",
    addedOn: "2026-11-18",
    newForDays: 45,
  },
];

// Each step points at a real menu item. `menu: true` means the item lives in the side menu, so the tour opens it first.
// `href` powers the "Open it now" button. Steps without an href only point at something on screen.
export const TOUR_STEPS = [
  { id: "dashboard", target: "tab-home", title: "Your dashboard", desc: "Home shows your latest study material, quick links and what to do next. You can come back here from any page.", href: "/home" },
  { id: "materials", target: "tab-library", title: "Study materials", desc: "Upload PDFs and notes for your courses, keep them private or share them with other students.", href: "/study-material" },
  { id: "ai", target: "tab-ai", title: "AI assistant", desc: "Chat with an AI tutor about your notes, get summaries and ask for practice questions.", href: "/ai" },
  { id: "tools", target: "side-flashcards", menu: true, title: "AI study tools", desc: "Turn your materials into flashcards and quizzes, so you test yourself instead of only re-reading.", href: "/flashcards" },
  { id: "classroom", target: "tab-classroom", title: "AI Classroom", desc: "A live AI lesson built from your notes, with a whiteboard, quick check-ins and a My learning page that shows what to revise.", href: "/classroom", feature: "feature:classroom" },
  { id: "planner", target: "side-planner", menu: true, title: "Study planner", desc: "Plan your revision around your exam dates so the work is spread out, not crammed.", href: "/study-plan" },
  ...(MARKETPLACE_ENABLED ? [{ id: "marketplace", target: "side-marketplace", menu: true, title: "Marketplace", desc: "Buy and sell textbooks and other academic items with students on your campus.", href: "/marketplace" }] : []),
  { id: "novels", target: "tab-novels", title: "Novels", desc: "Read stories by student writers, or become a writer and publish your own.", href: "/novels" },
  { id: "chat", target: "tab-chat", title: "Chat", desc: "Message other students, share voice notes and media, and set up study groups.", href: "/chat" },
  { id: "notifications", target: "notifications", title: "Notifications", desc: "Replies, messages and updates from UniLib show up here. A number on the bell means something is waiting." },
  { id: "profile", target: "user-avatar", title: "Profile and settings", desc: "Edit your details, university and photo. Light and dark mode are in the side menu under Appearance.", href: "/profile" },
  { id: "premium", target: "side-premium", menu: true, title: "Premium", desc: "See what Premium adds, including higher daily limits for the AI features.", href: "/premium" },
];
