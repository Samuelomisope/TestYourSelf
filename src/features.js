// Switches for parts of the app that are built but not open to users yet.
// Flip MARKETPLACE_ENABLED to true to bring the marketplace back everywhere (nav, home, search, routes).
export const MARKETPLACE_ENABLED = false;

// Classroom 2.1 (lecture-hall layout). Off for everyone unless the build sets VITE_CLASSROOM_V2_1_ENABLED=true.
// The owner can switch it on privately in one browser: open any page with ?classroom21=on (and ?classroom21=off to undo).
export const CLASSROOM_V2_1_ENABLED = import.meta.env?.VITE_CLASSROOM_V2_1_ENABLED === "true";
