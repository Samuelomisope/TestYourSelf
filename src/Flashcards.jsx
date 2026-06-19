import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown, faXmark, faPlus, faLayerGroup, faHouse, faBook, faRobot,
  faComments, faStore, faGlobe, faLock, faUser, faRotate, faCheck,
  faTrash, faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const TAB_LINKS = [
  { href: "/home",           label: "Home",   icon: faHouse },
  { href: "/study-material", label: "Study",  icon: faBook },
  { href: "/flashcards",     label: "Cards",  icon: faLayerGroup },
  { href: "/ai",             label: "AI",     icon: faRobot },
  { href: "/chat",           label: "Chat",   icon: faComments },
  { href: "/marketplace",    label: "Market", icon: faStore },
];

const formatDate = (ts) => {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

async function authedFetch(path, options = {}) {
  const { auth } = await import("./firebase");
  const { getIdToken } = await import("firebase/auth");
  const token = await getIdToken(auth.currentUser, true);
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

// Separate helper for multipart/form-data requests (file uploads).
// Do NOT set Content-Type manually here — the browser sets the correct
// multipart boundary automatically. Setting it yourself breaks the upload.
async function authedFetchForm(path, formData) {
  const { auth } = await import("./firebase");
  const { getIdToken } = await import("firebase/auth");
  const token = await getIdToken(auth.currentUser, true);
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

// ─── Create Deck Modal ──────────────────────────────────────────────
function CreateDeckModal({ onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [cards, setCards] = useState([{ front: "", back: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // AI generation state
  const [mode, setMode] = useState("manual"); // "manual" | "ai"
  const [aiText, setAiText] = useState("");
  const [aiFile, setAiFile] = useState(null);
  const [aiCount, setAiCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [sourceType, setSourceType] = useState("MANUAL");

  const handleGenerate = async () => {
    setError("");
    if (!aiText.trim() && !aiFile) {
      setError("Add some text or upload a file to generate from.");
      return;
    }
    setGenerating(true);
    try {
      const formData = new FormData();
      if (aiText.trim()) formData.append("text", aiText.trim());
      formData.append("count", aiCount.toString());
      if (aiFile) formData.append("file", aiFile);

      const { flashcards } = await authedFetchForm("/ai/flashcards", formData);
      setCards(flashcards?.length ? flashcards : [{ front: "", back: "" }]);
      setSourceType("AI_GENERATED");
      setMode("manual"); // drop into the card editor so the student can review/edit
    } catch (err) {
      console.error(err);
      setError("Couldn't generate flashcards. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const updateCard = (i, field, value) => {
    setCards(cs => cs.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const addCard = () => setCards(cs => [...cs, { front: "", back: "" }]);
  const removeCard = (i) => setCards(cs => cs.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    setError("");
    if (!title.trim()) { setError("Give your deck a title."); return; }
    const validCards = cards.filter(c => c.front.trim() && c.back.trim());
    if (validCards.length === 0) { setError("Add at least one complete card."); return; }

    setSaving(true);
    try {
      await authedFetch("/flashcards/decks", {
        method: "POST",
        body: JSON.stringify({ title, description, isPublic, cards: validCards, sourceType }),
      });
      onClose(true);
    } catch (err) {
      console.error(err);
      setError("Could not create deck. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-[#0d0d14] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <h2 className="font-bold text-white">New Flashcard Deck</h2>
          <button onClick={() => onClose(false)} className="text-white/30 hover:text-white transition">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && <p className="text-pink-400 text-sm mb-3">{error}</p>}

          <div className="mb-3">
            <label className="text-xs text-white/30 mb-1 block">Title</label>
            <input
              type="text"
              placeholder="e.g. Organic Chemistry — Reactions"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 transition"
            />
          </div>

          <div className="mb-4">
            <label className="text-xs text-white/30 mb-1 block">Description (optional)</label>
            <textarea
              placeholder="What's this deck about?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 resize-none transition"
            />
          </div>

          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => setIsPublic(true)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border transition flex items-center justify-center gap-1.5 ${
                isPublic ? "bg-violet-500/15 border-violet-500/40 text-violet-400" : "bg-white/5 border-white/10 text-white/40"
              }`}
            >
              <FontAwesomeIcon icon={faGlobe} /> Shared with university
            </button>
            <button
              onClick={() => setIsPublic(false)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border transition flex items-center justify-center gap-1.5 ${
                !isPublic ? "bg-violet-500/15 border-violet-500/40 text-violet-400" : "bg-white/5 border-white/10 text-white/40"
              }`}
            >
              <FontAwesomeIcon icon={faLock} /> Private
            </button>
          </div>

          {/* Manual vs AI toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode("manual")}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${
                mode === "manual" ? "bg-violet-500/15 border-violet-500/40 text-violet-400" : "bg-white/5 border-white/10 text-white/40"
              }`}
            >
              Write manually
            </button>
            <button
              onClick={() => setMode("ai")}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border transition flex items-center justify-center gap-1.5 ${
                mode === "ai" ? "bg-violet-500/15 border-violet-500/40 text-violet-400" : "bg-white/5 border-white/10 text-white/40"
              }`}
            >
              <FontAwesomeIcon icon={faWandMagicSparkles} className="text-xs" /> Generate with AI
            </button>
          </div>

          {mode === "ai" && (
            <div className="mb-5 bg-white/[0.03] border border-white/10 rounded-xl p-4">
              <label className="text-xs text-white/30 mb-1 block">Paste your notes</label>
              <textarea
                placeholder="Paste text to generate flashcards from…"
                value={aiText}
                onChange={e => setAiText(e.target.value)}
                rows={4}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 resize-none transition mb-3"
              />
              <label className="text-xs text-white/30 mb-1 block">Or upload a file (image, PDF, video)</label>
              <input
                type="file"
                accept="image/*,application/pdf,video/*"
                onChange={e => setAiFile(e.target.files?.[0] || null)}
                className="text-xs text-white/40 mb-3 block w-full"
              />
              <div className="flex items-center gap-3 mb-3">
                <label className="text-xs text-white/30">Number of cards</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={aiCount}
                  onChange={e => setAiCount(parseInt(e.target.value) || 10)}
                  className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-sm text-white outline-none"
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faWandMagicSparkles} />
                {generating ? "Generating…" : "Generate Cards"}
              </button>
            </div>
          )}

          {mode === "manual" && (
            <>
              <p className="text-xs text-white/30 mb-2 uppercase tracking-wide font-semibold">Cards</p>
              <div className="space-y-3">
                {cards.map((card, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/10 rounded-xl p-3 relative">
                    {cards.length > 1 && (
                      <button
                        onClick={() => removeCard(i)}
                        className="absolute top-2 right-2 w-6 h-6 bg-pink-500/15 text-pink-400 rounded-full flex items-center justify-center hover:bg-pink-500/25 transition"
                      >
                        <FontAwesomeIcon icon={faXmark} className="text-xs" />
                      </button>
                    )}
                    <input
                      type="text"
                      placeholder="Front (question)"
                      value={card.front}
                      onChange={e => updateCard(i, "front", e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 mb-2 transition"
                    />
                    <input
                      type="text"
                      placeholder="Back (answer)"
                      value={card.back}
                      onChange={e => updateCard(i, "back", e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 transition"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={addCard}
                className="w-full mt-3 py-2.5 border border-dashed border-white/15 text-white/40 hover:text-violet-400 hover:border-violet-500/40 rounded-xl text-sm transition flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faPlus} className="text-xs" /> Add another card
              </button>
            </>
          )}
        </div>

        <div className="p-6 pt-3 border-t border-white/5 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition"
          >
            {saving ? "Creating…" : "Create Deck"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Review Session ─────────────────────────────────────────────────
function ReviewSession({ deckId, onClose }) {
  const [dueCards, setDueCards] = useState(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  useEffect(() => {
    authedFetch(`/flashcards/decks/${deckId}/due`)
      .then(setDueCards)
      .catch(() => setDueCards([]));
  }, [deckId]);

  const currentCard = dueCards?.[index];

  const handleRate = async (rating) => {
    if (!currentCard) return;
    try {
      await authedFetch(`/flashcards/cards/${currentCard.id}/review`, {
        method: "POST",
        body: JSON.stringify({ rating }),
      });
    } catch (err) {
      console.error(err);
    }
    setReviewedCount(c => c + 1);
    setFlipped(false);
    if (index + 1 >= dueCards.length) {
      setSessionDone(true);
    } else {
      setIndex(i => i + 1);
    }
  };

  const RATING_BUTTONS = [
    { label: "Again", value: "AGAIN", color: "bg-pink-500/15 text-pink-400 border-pink-500/30 hover:bg-pink-500/25" },
    { label: "Hard",  value: "HARD",  color: "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25" },
    { label: "Good",  value: "GOOD",  color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25" },
    { label: "Easy",  value: "EASY",  color: "bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25" },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-white/40">
            {dueCards ? `${Math.min(index + 1, dueCards.length)} of ${dueCards.length}` : "Loading…"}
          </p>
          <button onClick={onClose} className="text-white/30 hover:text-white transition">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {dueCards === null && (
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 text-center text-white/30 text-sm">
            Loading due cards…
          </div>
        )}

        {dueCards && dueCards.length === 0 && (
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 text-center">
            <p className="text-4xl mb-3 text-emerald-400"><FontAwesomeIcon icon={faCheck} /></p>
            <p className="text-white font-semibold mb-1">All caught up!</p>
            <p className="text-white/40 text-sm">No cards are due for review right now.</p>
            <button onClick={onClose} className="mt-5 px-6 py-2.5 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-sm transition">
              Close
            </button>
          </div>
        )}

        {dueCards && dueCards.length > 0 && sessionDone && (
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-10 text-center">
            <p className="text-4xl mb-3 text-violet-400"><FontAwesomeIcon icon={faCheck} /></p>
            <p className="text-white font-semibold mb-1">Session complete</p>
            <p className="text-white/40 text-sm">You reviewed {reviewedCount} card{reviewedCount === 1 ? "" : "s"}.</p>
            <button onClick={onClose} className="mt-5 px-6 py-2.5 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-sm transition">
              Done
            </button>
          </div>
        )}

        {dueCards && dueCards.length > 0 && !sessionDone && currentCard && (
          <>
            <div
              onClick={() => setFlipped(f => !f)}
              className="bg-white/[0.04] border border-white/10 rounded-3xl p-10 min-h-[220px] flex items-center justify-center text-center cursor-pointer hover:border-violet-500/30 transition"
            >
              <div>
                <p className="text-xs text-white/20 uppercase tracking-widest mb-3">
                  {flipped ? "Answer" : "Question"}
                </p>
                <p className="text-white text-lg font-medium leading-relaxed">
                  {flipped ? currentCard.back : currentCard.front}
                </p>
              </div>
            </div>

            {!flipped && (
              <button
                onClick={() => setFlipped(true)}
                className="w-full mt-4 py-3 bg-white/5 border border-white/10 hover:border-violet-500/40 text-white/70 hover:text-violet-400 rounded-xl text-sm font-medium transition"
              >
                Show answer
              </button>
            )}

            {flipped && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {RATING_BUTTONS.map(btn => (
                  <button
                    key={btn.value}
                    onClick={() => handleRate(btn.value)}
                    className={`py-3 rounded-xl text-xs font-medium border transition ${btn.color}`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Deck Card ───────────────────────────────────────────────────────
function DeckCard({ deck, user, onStudy, onDelete }) {
  const isOwner = deck.userId === user?.uid || deck.user?.displayName === user?.displayName;
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 hover:border-violet-500/30 transition group relative">
      {isOwner && (
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (!window.confirm("Delete this deck?")) return;
            try {
              await authedFetch(`/flashcards/decks/${deck.id}`, { method: "DELETE" });
              onDelete();
            } catch (err) { console.error(err); }
          }}
          className="absolute top-3 right-3 w-7 h-7 bg-pink-500/15 text-pink-400 rounded-full flex items-center justify-center hover:bg-pink-500/25 transition opacity-0 group-hover:opacity-100"
        >
          <FontAwesomeIcon icon={faTrash} className="text-xs" />
        </button>
      )}
      <div className="w-10 h-10 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center text-violet-400 mb-3">
        <FontAwesomeIcon icon={faLayerGroup} />
      </div>
      <p className="text-sm font-semibold text-white mb-1 truncate pr-6">{deck.title}</p>
      {deck.description && <p className="text-xs text-white/30 mb-2 line-clamp-2">{deck.description}</p>}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs px-2 py-0.5 bg-white/5 text-white/40 rounded-full">{deck.cards?.length || 0} cards</span>
        {deck.sourceType === "AI_GENERATED" && (
          <span className="text-xs px-2 py-0.5 bg-violet-500/15 text-violet-400 rounded-full flex items-center gap-1">
            <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[10px]" /> AI
          </span>
        )}
        {deck.isPublic ? (
          <FontAwesomeIcon icon={faGlobe} className="text-white/20 text-xs" />
        ) : (
          <FontAwesomeIcon icon={faLock} className="text-white/20 text-xs" />
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-white/20 mb-3">
        <span><FontAwesomeIcon icon={faUser} className="mr-1" />{deck.user?.displayName}</span>
        <span>{formatDate(deck.createdAt)}</span>
      </div>
      <button
        onClick={() => onStudy(deck.id)}
        className="w-full py-2 bg-violet-500/15 border border-violet-500/30 hover:bg-violet-500/25 text-violet-400 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5"
      >
        <FontAwesomeIcon icon={faRotate} /> Study
      </button>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
function Flashcards() {
  const { user } = useAuth();
  const location = useLocation();
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all"); // "all" | "mine"
  const [showCreate, setShowCreate] = useState(false);
  const [studyingDeckId, setStudyingDeckId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const path = tab === "mine" ? "/flashcards/decks/my" : "/flashcards/decks";
    authedFetch(path)
      .then(setDecks)
      .catch(() => setDecks([]))
      .finally(() => setLoading(false));
  }, [user, tab, refreshKey]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-500 rounded-full opacity-[0.06] blur-[100px]" />
      </div>

      <header className="fixed top-0 left-0 w-full z-40 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-3">
              <Link to="/home" className="text-white/40 hover:text-violet-400 transition">
                <FontAwesomeIcon icon={faChevronDown} className="rotate-90" />
              </Link>
              <h1 className="text-lg font-black tracking-tight">
                TEST<span className="text-violet-400">YOURSELF</span>
                <span className="ml-2 text-xs font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full align-middle">Flashcards</span>
              </h1>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-violet-500 hover:bg-violet-400 text-white px-4 py-2 rounded-full text-sm font-medium transition"
            >
              <FontAwesomeIcon icon={faPlus} />
              New Deck
            </button>
          </div>

          <div className="flex items-center justify-around border-t border-white/5 px-2">
            {TAB_LINKS.map((t) => {
              const isActive = location.pathname === t.href;
              return (
                <Link key={t.href} to={t.href}
                  className={`flex flex-col items-center py-2 px-4 border-b-2 transition text-xs gap-0.5 ${
                    isActive ? "border-violet-500 text-violet-400" : "border-transparent text-white/30 hover:text-white/60"
                  }`}>
                  <FontAwesomeIcon icon={t.icon} className="w-4 h-4" />
                  <span>{t.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-28 px-4 pb-10 max-w-6xl mx-auto">

        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setTab("all")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition border ${
              tab === "all" ? "bg-violet-500 text-white border-violet-500" : "bg-white/[0.03] border-white/10 text-white/50"
            }`}
          >
            All Decks
          </button>
          <button
            onClick={() => setTab("mine")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition border ${
              tab === "mine" ? "bg-violet-500 text-white border-violet-500" : "bg-white/[0.03] border-white/10 text-white/50"
            }`}
          >
            My Decks
          </button>
        </div>

        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 animate-pulse h-40" />
            ))}
          </div>
        )}

        {!loading && decks.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4 text-white/10"><FontAwesomeIcon icon={faLayerGroup} /></p>
            <p className="text-white/40 font-medium">No flashcard decks yet</p>
            <p className="text-white/20 text-sm mt-1">Create your first deck to start studying</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-6 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-sm transition"
            >
              Create Deck
            </button>
          </div>
        )}

        {!loading && decks.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {decks.map(deck => (
              <DeckCard
                key={deck.id}
                deck={deck}
                user={user}
                onStudy={setStudyingDeckId}
                onDelete={() => setRefreshKey(k => k + 1)}
              />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateDeckModal
          onClose={(created) => {
            setShowCreate(false);
            if (created) setRefreshKey(k => k + 1);
          }}
        />
      )}

      {studyingDeckId && (
        <ReviewSession
          deckId={studyingDeckId}
          onClose={() => setStudyingDeckId(null)}
        />
      )}
    </div>
  );
}

export default Flashcards;
