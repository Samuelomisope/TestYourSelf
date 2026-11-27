import { CLASSROOM_V2_1_ENABLED } from "./features";

export const V21_STORAGE_KEY = "unilib.classroom21";

// Pure decision so it can be tested: the build flag wins; otherwise a private per-browser switch.
export function resolveV21({ buildFlag, stored }) {
  if (buildFlag) return true;
  return stored === "on";
}

// Reads ?classroom21=on|off once, remembers it in this browser, and strips nothing from the URL.
export function readV21Switch(search, storage) {
  let value;
  try { value = new URLSearchParams(search).get("classroom21"); } catch { value = null; }
  try {
    if (value === "on") storage?.setItem(V21_STORAGE_KEY, "on");
    else if (value === "off") storage?.removeItem(V21_STORAGE_KEY);
    const saved = storage?.getItem(V21_STORAGE_KEY) ?? null;
    return saved ?? (value === "on" && !storage ? "on" : null);
  } catch {
    return value === "on" ? "on" : null;
  }
}

export function isClassroomV21() {
  if (typeof window === "undefined") return CLASSROOM_V2_1_ENABLED;
  let storage = null;
  try { storage = window.localStorage; } catch { storage = null; }
  return resolveV21({ buildFlag: CLASSROOM_V2_1_ENABLED, stored: readV21Switch(window.location.search, storage) });
}
