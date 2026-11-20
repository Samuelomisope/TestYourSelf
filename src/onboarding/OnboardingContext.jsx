import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../useAuth";
import { apiFetch, apiGet } from "../api";
import { featureForPath, isValidKey, newFeatures, readLegacyTourSeen, shouldAutoStartTour } from "./logic.js";
import { TOUR_KEY } from "./registry.js";
import { Ctx } from "./context";

// Per-user "seen" state lives on the server so it follows the person across devices. Every call fails quietly:
// onboarding must never block or break the app. Remounted per user (key) so one account's state never leaks to the next.
export function OnboardingProvider({ children }) {
  const { user } = useAuth();
  return <Inner key={user?.id || "anon"} user={user}>{children}</Inner>;
}

function Inner({ user, children }) {
  const userId = user?.id;
  const location = useLocation();
  const [seen, setSeen] = useState(() => new Set());
  const [ready, setReady] = useState(false);
  const [manualTour, setManualTour] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    apiGet("/onboarding/seen")
      .then((data) => { if (!cancelled) setSeen(new Set(Array.isArray(data?.keys) ? data.keys.filter(isValidKey) : [])); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [userId]);

  const markSeen = useCallback((key) => {
    if (!isValidKey(key)) return;
    setSeen((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
    apiFetch(`/onboarding/seen/${encodeURIComponent(key)}`, { method: "PUT" }).catch(() => {});
  }, []);

  // Opening a NEW feature counts as seeing it.
  useEffect(() => {
    const feature = ready ? featureForPath(location.pathname) : null;
    if (!feature || seen.has(feature.key)) return undefined;
    const t = setTimeout(() => markSeen(feature.key), 0); // after render, so state is not set inside the effect body
    return () => clearTimeout(t);
  }, [ready, location.pathname, seen, markSeen]);

  const legacySeen = useMemo(() => { try { return readLegacyTourSeen(window.localStorage); } catch { return false; } }, []);

  // Someone who finished the old tour is not shown the new one by itself. Record that once, on the server.
  useEffect(() => {
    if (!ready || !legacySeen || seen.has(TOUR_KEY)) return undefined;
    const t = setTimeout(() => markSeen(TOUR_KEY), 0);
    return () => clearTimeout(t);
  }, [ready, legacySeen, seen, markSeen]);

  // Starts by itself only on the home page, only for a young account that has not done the tour. Finishing it
  // records tour:v2, which turns this off for good.
  const autoTour = location.pathname === "/home" && shouldAutoStartTour({ ready, createdAt: user?.createdAt, seen, legacySeen });
  const tourOpen = manualTour || autoTour;

  const unseen = useMemo(() => (ready ? newFeatures(seen) : []), [ready, seen]);
  const isNew = useCallback((key) => unseen.some((f) => f.key === key), [unseen]);

  const value = useMemo(() => ({
    ready, seen, unseen, isNew, markSeen, tourOpen,
    startTour: () => { setWhatsNewOpen(false); setManualTour(true); },
    closeTour: () => { setManualTour(false); markSeen(TOUR_KEY); },
    whatsNewOpen, openWhatsNew: () => setWhatsNewOpen(true), closeWhatsNew: () => setWhatsNewOpen(false),
  }), [ready, seen, unseen, isNew, markSeen, tourOpen, whatsNewOpen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
