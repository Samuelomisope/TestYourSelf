import { createContext, useContext, useEffect } from "react";

export const Ctx = createContext(null);
export const NOOP = {
  ready: false, seen: new Set(), unseen: [], isNew: () => false, markSeen: () => {},
  tourOpen: false, startTour: () => {}, closeTour: () => {}, whatsNewOpen: false, openWhatsNew: () => {}, closeWhatsNew: () => {},
};
export const useOnboarding = () => useContext(Ctx) || NOOP;

// The menu lives in Navbar and Home. Both listen for this so the tour can open or close it.
export const setMenuOpenEvent = (open) => window.dispatchEvent(new CustomEvent("unilib:menu", { detail: { open } }));
export const useMenuEvent = (setMenuOpen) => {
  useEffect(() => {
    const onMenu = (e) => setMenuOpen(!!e.detail?.open);
    window.addEventListener("unilib:menu", onMenu);
    return () => window.removeEventListener("unilib:menu", onMenu);
  }, [setMenuOpen]);
};
