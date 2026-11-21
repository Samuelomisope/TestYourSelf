import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../useAuth";
import { apiGet } from "../api";
import { readOpened } from "./lastOpened.js";
import { lessonCandidate, localCandidates, pickContinue } from "./continueView.js";
import { dueHeadline, streakText, topDueDeck } from "./studySummary.js";

const ICON = { material: "📄", deck: "🗂️", lesson: "🎓" };
const LABEL = { material: "Continue reading", deck: "Continue studying", lesson: "Continue your lesson" };

// Two small cards at the top of Home: pick up where you stopped, and what to review today. Everything fails quietly:
// a missing piece just hides its card.
export default function HomeStudyBar() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [sessions, setSessions] = useState(null);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    const tz = -new Date().getTimezoneOffset();
    apiGet(`/flashcards/summary?tz=${tz}`).then((d) => { if (!cancelled) setSummary(d); }).catch(() => {});
    apiGet("/classroom/sessions").then((d) => { if (!cancelled) setSessions(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id]);

  const next = useMemo(() => {
    let storage = null;
    try { storage = window.localStorage; } catch { /* blocked */ }
    return pickContinue([...localCandidates(readOpened(storage, user?.id)), lessonCandidate(sessions)]);
  }, [user?.id, sessions]);

  const headline = dueHeadline(summary);
  const streak = streakText(summary);
  const deck = topDueDeck(summary);
  if (!next && !headline) return null;

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {next && (
        <Link to={next.href} className="flex min-h-[88px] items-center gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 transition hover:border-violet-500/40">
          <span aria-hidden="true" className="text-2xl">{ICON[next.kind]}</span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-widest text-violet-400">{LABEL[next.kind]}</span>
            <span className="block truncate text-sm font-semibold text-ink">{next.title}</span>
            <span className="block text-xs text-ink/40">{next.detail}</span>
          </span>
        </Link>
      )}
      {headline && (
        <Link to={deck ? `/flashcards?deck=${encodeURIComponent(deck.deckId)}` : "/flashcards"} className="flex min-h-[88px] items-center gap-3 rounded-2xl border border-ink/10 bg-white/[0.03] p-4 transition hover:border-violet-500/30">
          <span aria-hidden="true" className="text-2xl">🧠</span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-widest text-violet-400">Flashcards</span>
            <span className="block text-sm font-semibold text-ink">{headline}</span>
            <span className="block truncate text-xs text-ink/40">{streak || (deck ? `Start with ${deck.title}` : "Spaced repetition keeps it fresh")}</span>
          </span>
        </Link>
      )}
    </div>
  );
}
