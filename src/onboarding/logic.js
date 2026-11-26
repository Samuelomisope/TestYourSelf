import { FEATURES, LEGACY_TOUR_KEY, NEW_ACCOUNT_DAYS, TOUR_KEY } from "./registry.js";

const DAY = 24 * 60 * 60 * 1000;

// Must stay in step with the server's key rule.
export const isValidKey = (key) => typeof key === "string" && /^[a-z0-9][a-z0-9:_-]{1,63}$/.test(key);

export function isNewAccount(createdAt, now = Date.now(), days = NEW_ACCOUNT_DAYS) {
  const made = new Date(createdAt).getTime();
  if (!Number.isFinite(made)) return false; // unknown age: never push a tour on someone
  return now - made >= 0 && now - made < days * DAY;
}

/** The tour starts by itself only for a young account that has not finished it, on any device, and did not see the old one. */
export function shouldAutoStartTour({ ready, createdAt, seen, legacySeen, now = Date.now() }) {
  if (!ready || legacySeen) return false;
  if (seen.has(TOUR_KEY)) return false;
  return isNewAccount(createdAt, now);
}

export function isFeatureNew(feature, seen, now = Date.now()) {
  if (seen.has(feature.key)) return false;
  const added = new Date(feature.addedOn).getTime();
  if (!Number.isFinite(added)) return false;
  return now - added < feature.newForDays * DAY;
}

export function newFeatures(seen, now = Date.now(), features = FEATURES) {
  return features.filter((f) => isFeatureNew(f, seen, now));
}

/** Which feature, if any, a path belongs to. Used to mark a feature seen when someone opens it. */
export function featureForPath(pathname, features = FEATURES) {
  return features.find((f) => pathname === f.href || pathname.startsWith(f.href + "/")) || null;
}

export function readLegacyTourSeen(storage) {
  try { return storage?.getItem(LEGACY_TOUR_KEY) != null; } catch { return false; }
}

/**
 * Where the tour card goes. On a phone it is a sheet at the bottom, or at the top when the spotlight is low on the
 * screen so the card never covers what it is pointing at. On a wider screen it sits beside or below the target.
 * rect is viewport based {top,left,width,height}; null means there is nothing to point at, so the card is centred.
 */
export function cardPlacement(rect, vw, vh, cardH = 220) {
  const phone = vw < 640;
  if (!rect) return { mode: "center" };
  if (phone) {
    const targetMid = rect.top + rect.height / 2;
    return { mode: targetMid > vh - cardH - 24 ? "top" : "bottom" };
  }
  const w = 340;
  const gap = 14;
  let left = rect.left + rect.width + gap;
  let top = rect.top + rect.height / 2 - cardH / 2;
  if (left + w > vw - 12) {
    left = rect.left + rect.width / 2 - w / 2;
    top = rect.top + rect.height + gap;
    if (top + cardH > vh - 12) top = rect.top - cardH - gap;
  }
  left = Math.max(12, Math.min(left, vw - w - 12));
  top = Math.max(12, Math.min(top, vh - cardH - 12));
  return { mode: "float", top, left, width: w };
}

/** Cheap ordering helper so the tour never shows the wrong number if steps are added later. */
export const stepLabel = (index, total) => `Step ${index + 1} of ${total}`;
