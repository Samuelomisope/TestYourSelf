// The server refuses a request over a limit with a 409 and one of three fixed messages. We read the message text
// (describeError passes it through) so no API change is needed.
export function quotaKind(message) {
  const text = typeof message === "string" ? message.toLowerCase() : "";
  if (!text.includes("quota reached")) return null;
  if (text.includes("turn")) return "turns";
  if (text.includes("upload")) return "upload";
  if (text.includes("document")) return "documents";
  return "turns";
}

const WHAT = {
  turns: { title: "You've used today's tutor turns", body: "Your free daily turns for AI Classroom are used up. They come back with the new day, and you can keep reading your lessons, notes and whiteboard in the meantime." },
  upload: { title: "You've reached today's upload limit", body: "Your free daily upload allowance is used up. It comes back with the new day. You can still teach from UniLib materials you've already linked." },
  documents: { title: "You've reached your document limit", body: "You've hit the number of documents free accounts can keep in AI Classroom. Remove one you no longer need, or move up to Premium." },
};

/** What to show for a limit message. Premium accounts get no sales pitch, just the plain fact. */
export function quotaNotice(kind, premium) {
  const base = WHAT[kind];
  if (!base) return null;
  if (premium) {
    return { title: base.title, body: base.body.replace(/free /gi, "").replace("or move up to Premium", "or try again later"), upsell: false };
  }
  return { ...base, upsell: true };
}

export const PREMIUM_CLASSROOM_BENEFITS = [
  "More AI Classroom tutor turns every day",
  "Higher daily upload and document limits",
  "Longer documents taught in full",
  "The animated 3D tutor",
];
