// Pure helpers for the lesson video card, kept apart so they can be tested without rendering.

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export const isVideoId = (value) => typeof value === "string" && VIDEO_ID.test(value);

/** 125 -> "2:05", 3849 -> "1:04:09". */
export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Privacy-friendly embed address. Returns null for anything that is not a real video id. */
export function embedUrl(videoId) {
  return isVideoId(videoId) ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1` : null;
}

export const thumbUrl = (videoId) => (isVideoId(videoId) ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : null);

/** Keeps only well-formed videos from a server reply. */
export function readVideos(result) {
  const list = Array.isArray(result?.videos) ? result.videos : [];
  return list
    .filter((v) => v && isVideoId(v.videoId))
    .map((v) => ({ videoId: v.videoId, title: String(v.title || "Lesson video").slice(0, 160), channel: String(v.channel || "").slice(0, 80), durationSeconds: Number(v.durationSeconds) || 0 }));
}

/** What to tell the student when no videos came back. `upgrade` shows the Premium link. */
export function emptyMessage(result) {
  const premium = result?.tier === "PREMIUM";
  switch (result?.reason) {
    case "LIMIT_REACHED":
      return premium
        ? { text: "You have used today’s video suggestions. They reset tomorrow.", upgrade: false }
        : { text: "You have used today’s free video suggestions. Premium students get more videos for every step.", upgrade: true };
    case "NOT_CONFIGURED":
      return { text: "Video suggestions are not available right now.", upgrade: false };
    case "BUSY":
      return { text: "We could not load videos just now. Please try again later.", upgrade: false };
    default:
      return { text: "We did not find a good video for this step.", upgrade: false };
  }
}

/** A short note under the list: how many videos this plan shows, and how many lookups are left. */
export function planNote(result) {
  if (!result) return "";
  const parts = [];
  if (result.tier === "FREE" && result.perStep) parts.push(`Free plan: ${result.perStep} video per step. Premium shows up to 5.`);
  if (Number.isInteger(result.lookupsRemaining)) parts.push(`${result.lookupsRemaining} video ${result.lookupsRemaining === 1 ? "lookup" : "lookups"} left today.`);
  return parts.join(" ");
}
