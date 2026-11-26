// The tutor's visible state (Phase E). One pure function decides it from what is happening, so the status label now and
// the 3D tutor later (Phase F) read the same thing instead of each working it out.

export const TUTOR_STATES = ["idle", "thinking", "speaking", "listening", "explaining", "celebrating", "paused"];

export const TUTOR_LABELS = {
  idle: "Ready",
  thinking: "Thinking…",
  speaking: "Speaking",
  listening: "Listening…",
  explaining: "Explaining on the board",
  celebrating: "Well done!",
  paused: "Paused",
};

/**
 * Who has the floor, in order: the student speaking wins, then the tutor working on a reply, then a celebration, then a
 * paused lesson, then speech, then a lesson that is playing silently (muted, text-only, or showing the board).
 */
export function tutorState({ listening = false, sending = false, celebrating = false, playerStatus = "idle", speaking = false } = {}) {
  if (listening) return "listening";
  if (sending) return "thinking";
  if (celebrating) return "celebrating";
  if (playerStatus === "paused") return "paused";
  if (speaking) return "speaking";
  if (playerStatus === "playing") return "explaining";
  return "idle";
}
