// The student's voice settings (Phase E), kept in the browser: a convenience for this device, not lesson data.
// Storage can be missing, full or blocked, and a stored value can be damaged, so every read is validated.

export const VOICE_KEY = "unilib.classroom.voice";
export const DEFAULT_VOICE_PREFS = { autoSpeak: false, rate: 1, voiceName: "" };
const RATES = [0.75, 1, 1.25, 1.5];

export function sanitizeVoicePrefs(value) {
  const v = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    autoSpeak: v.autoSpeak === true,
    rate: RATES.includes(v.rate) ? v.rate : DEFAULT_VOICE_PREFS.rate,
    voiceName: typeof v.voiceName === "string" ? v.voiceName.slice(0, 200) : "",
  };
}

export function loadVoicePrefs(storage) {
  try {
    const raw = storage?.getItem(VOICE_KEY);
    return raw ? sanitizeVoicePrefs(JSON.parse(raw)) : { ...DEFAULT_VOICE_PREFS };
  } catch { return { ...DEFAULT_VOICE_PREFS }; }
}

export function saveVoicePrefs(storage, prefs) {
  if (!storage) return false;
  try { storage.setItem(VOICE_KEY, JSON.stringify(sanitizeVoicePrefs(prefs))); return true; }
  catch { return false; }
}

/** The browser's localStorage, or undefined when it is missing or blocked (private windows, strict settings). */
export function browserStorage() {
  try { return typeof window === "undefined" ? undefined : window.localStorage; } catch { return undefined; }
}
