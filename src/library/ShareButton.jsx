import { useState } from "react";
import { shareUrl } from "./libraryLinks.js";

export default function ShareButton({ file }) {
  const [state, setState] = useState("idle"); // idle | copied | failed
  if (file.isPublic === false) return null; // a private file only opens for its owner
  const url = shareUrl(window.location.origin, file.id);

  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: file.title, url }); return; }
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch (err) {
      if (err?.name === "AbortError") return; // the person closed the share sheet
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2500);
  };

  return (
    <button onClick={share} className="flex-1 min-h-11 rounded-xl border border-ink/10 text-sm font-medium text-ink/70 transition hover:bg-white/5" aria-live="polite">
      {state === "copied" ? "Link copied" : state === "failed" ? "Couldn't copy" : "Share"}
    </button>
  );
}
