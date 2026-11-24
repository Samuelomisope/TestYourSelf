// Which section of UniLib a page belongs to, and when to report an opening of it. Only the section name is ever sent,
// never the page address, so nothing about what a person looked at inside a section leaves the app.

const RULES = [
  [/^\/home(\/|$)/, "home"],
  [/^\/study-material(\/|$)/, "library"],
  [/^\/search(\/|$)/, "search"],
  [/^\/practice(\/|$)/, "practice"],
  [/^\/flashcards(\/|$)/, "flashcards"],
  [/^\/ai(\/|$)/, "ai_tools"],
  [/^\/classroom(\/|$)/, "classroom"],
  [/^\/study-plan(\/|$)/, "study_plan"],
  [/^\/chat(\/|$)/, "chat"],
  [/^\/marketplace(\/|$)/, "marketplace"],
  [/^\/(novels|episodes|writer)(\/|$)/, "novels"],
  [/^\/schools(\/|$)/, "schools"],
  [/^\/premium(\/|$)/, "premium"],
  [/^\/profile(\/|$)/, "profile"],
  [/^\/settings(\/|$)/, "settings"],
  [/^\/feedback(\/|$)/, "feedback"],
];

/** The section name for a path, or null for pages that are not counted (sign in, admin, legal pages, unknown pages). */
export function featureForPath(pathname) {
  const path = String(pathname ?? "");
  for (const [pattern, key] of RULES) if (pattern.test(path)) return key;
  return null;
}

export const SESSION_GAP_MS = 30 * 60 * 1000;

/**
 * Decides when an opening counts. Moving around inside one section (a marketplace list, then one listing) is one visit;
 * coming back to a section after 30 quiet minutes, or arriving from another section, is a new one.
 * `send(feature)` is called for each counted visit; it must never throw into the page.
 */
export function createVisitReporter({ send, now = () => Date.now(), gap = SESSION_GAP_MS }) {
  let last = { feature: null, at: 0 };
  return {
    visit(pathname) {
      const feature = featureForPath(pathname);
      if (!feature) return false;
      const t = now();
      const repeat = feature === last.feature && t - last.at < gap;
      last = { feature, at: t };
      if (repeat) return false;
      try { send(feature); } catch { /* counting must never break the page */ }
      return true;
    },
    reset() { last = { feature: null, at: 0 }; },
  };
}
