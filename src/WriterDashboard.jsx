import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown, faXmark, faPlus, faBookOpen, faPenNib,
} from '@fortawesome/free-solid-svg-icons';
import { apiGet, apiPost } from "./api";

const GENRE_LABELS = {
  ROMANCE: "Romance", FANTASY: "Fantasy", THRILLER: "Thriller",
  MYSTERY: "Mystery", SCI_FI: "Sci-Fi", HORROR: "Horror",
  DRAMA: "Drama", ADVENTURE: "Adventure", COMEDY: "Comedy",
  ACTION: "Action", HISTORICAL: "Historical", POETRY: "Poetry",
};

// ─── Create Novel Modal ─────────────────────────────────────
function CreateNovelModal({ genres, onClose }) {
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [genre, setGenre] = useState(genres[0] || "");
  const [coverUrl, setCoverUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!title.trim() || !synopsis.trim() || !genre) {
      setError("Fill in title, synopsis, and genre.");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/novels", {
        title: title.trim(),
        synopsis: synopsis.trim(),
        genre,
        coverUrl: coverUrl.trim() || undefined,
      });
      onClose(true);
    } catch (err) {
      console.error(err);
      setError("Could not create novel. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-bg-elevated border border-ink/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/5 shrink-0">
          <h2 className="font-bold text-ink">New Novel</h2>
          <button onClick={() => onClose(false)} className="text-ink/30 hover:text-ink transition">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && <p className="text-pink-400 text-sm mb-3">{error}</p>}

          <div className="mb-3">
            <label className="text-xs text-ink/30 mb-1 block">Title</label>
            <input
              type="text"
              placeholder="e.g. The Last Harmattan"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-black/40 border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 transition"
            />
          </div>

          <div className="mb-3">
            <label className="text-xs text-ink/30 mb-1 block">Synopsis</label>
            <textarea
              placeholder="What's your story about?"
              value={synopsis}
              onChange={e => setSynopsis(e.target.value)}
              rows={3}
              className="w-full bg-black/40 border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 resize-none transition"
            />
          </div>

          <div className="mb-3">
            <label className="text-xs text-ink/30 mb-1 block">Genre</label>
            <select
              value={genre}
              onChange={e => setGenre(e.target.value)}
              className="w-full bg-black/40 border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:border-violet-500/60 transition"
            >
              {genres.map(g => (
                <option key={g} value={g} className="bg-bg-elevated">
                  {GENRE_LABELS[g] || g}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-2">
            <label className="text-xs text-ink/30 mb-1 block">Cover image URL (optional)</label>
            <input
              type="text"
              placeholder="https://…"
              value={coverUrl}
              onChange={e => setCoverUrl(e.target.value)}
              className="w-full bg-black/40 border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 transition"
            />
          </div>
        </div>

        <div className="p-6 pt-3 border-t border-ink/5 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-ink rounded-xl text-sm font-medium transition"
          >
            {saving ? "Creating…" : "Create Novel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Episode Modal ───────────────────────────────────────
function AddEpisodeModal({ novel, onClose }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!title.trim() || !content.trim()) {
      setError("Add a title and the episode content.");
      return;
    }
    setSaving(true);
    try {
      await apiPost(`/novels/${novel.id}/episodes`, {
        title: title.trim(),
        content: content.trim(),
        isPublished,
      });
      onClose(true);
    } catch (err) {
      console.error(err);
      setError("Could not add episode. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-bg-elevated border border-ink/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/5 shrink-0">
          <h2 className="font-bold text-ink">New Episode — {novel.title}</h2>
          <button onClick={() => onClose(false)} className="text-ink/30 hover:text-ink transition">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && <p className="text-pink-400 text-sm mb-3">{error}</p>}

          <div className="mb-3">
            <label className="text-xs text-ink/30 mb-1 block">Episode title</label>
            <input
              type="text"
              placeholder="e.g. Chapter 1: The Beginning"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-black/40 border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 transition"
            />
          </div>

          <div className="mb-4">
            <label className="text-xs text-ink/30 mb-1 block">Content</label>
            <textarea
              placeholder="Write your episode…"
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={10}
              className="w-full bg-black/40 border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 resize-none transition"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPublished(true)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${
                isPublished ? "bg-violet-500/15 border-violet-500/40 text-violet-400" : "bg-white/5 border-ink/10 text-ink/40"
              }`}
            >
              Publish now
            </button>
            <button
              onClick={() => setIsPublished(false)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${
                !isPublished ? "bg-violet-500/15 border-violet-500/40 text-violet-400" : "bg-white/5 border-ink/10 text-ink/40"
              }`}
            >
              Save as draft
            </button>
          </div>
        </div>

        <div className="p-6 pt-3 border-t border-ink/5 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-ink rounded-xl text-sm font-medium transition"
          >
            {saving ? "Saving…" : "Save Episode"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Novel Row ────────────────────────────────────────────────
function NovelRow({ novel, onAddEpisode }) {
  return (
    <div className="bg-white/[0.03] border border-ink/10 rounded-2xl p-4 flex items-center gap-4">
      <div className="w-12 h-16 bg-violet-500/10 border border-violet-500/20 rounded-lg flex items-center justify-center text-violet-400 overflow-hidden shrink-0">
        {novel.coverUrl ? (
          <img src={novel.coverUrl} alt={novel.title} className="w-full h-full object-cover" />
        ) : (
          <FontAwesomeIcon icon={faBookOpen} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink truncate">{novel.title}</p>
        <p className="text-xs text-ink/30">
          {GENRE_LABELS[novel.genre] || novel.genre} · {novel._count?.episodes ?? 0} episode{novel._count?.episodes === 1 ? "" : "s"}
        </p>
      </div>
      <button
        onClick={() => onAddEpisode(novel)}
        className="px-4 py-2 bg-violet-500/15 border border-violet-500/30 hover:bg-violet-500/25 text-violet-400 rounded-xl text-xs font-medium transition shrink-0"
      >
        + Episode
      </button>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────
function WriterDashboard() {
  const [novels, setNovels] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [episodeTarget, setEpisodeTarget] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    apiGet("/novels/genres").then(setGenres).catch(() => setGenres([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    apiGet("/novels/mine")
      .then(setNovels)
      .catch(() => setNovels([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-500 rounded-full opacity-[0.06] blur-[100px]" />
      </div>

      <header className="fixed top-0 left-0 w-full z-40 bg-bg/80 backdrop-blur-md border-b border-ink/5">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/novels" className="text-ink/40 hover:text-violet-400 transition">
              <FontAwesomeIcon icon={faChevronDown} className="rotate-90" />
            </Link>
            <h1 className="text-lg font-black tracking-tight">
              <FontAwesomeIcon icon={faPenNib} className="text-violet-400 mr-2" />
              Writer Dashboard
            </h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-violet-500 hover:bg-violet-400 text-white px-4 py-2 rounded-full text-sm font-medium transition"
          >
            <FontAwesomeIcon icon={faPlus} />
            New Novel
          </button>
        </div>
      </header>

      <main className="relative z-10 pt-24 px-4 pb-10 max-w-4xl mx-auto">
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white/[0.03] border border-ink/10 rounded-2xl p-4 animate-pulse h-20" />
            ))}
          </div>
        )}

        {!loading && novels.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4 text-ink/10"><FontAwesomeIcon icon={faBookOpen} /></p>
            <p className="text-ink/40 font-medium">No novels yet</p>
            <p className="text-ink/20 text-sm mt-1">Create your first novel to start publishing episodes</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-6 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-sm transition"
            >
              Create Novel
            </button>
          </div>
        )}

        {!loading && novels.length > 0 && (
          <div className="space-y-3">
            {novels.map(novel => (
              <NovelRow key={novel.id} novel={novel} onAddEpisode={setEpisodeTarget} />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateNovelModal
          genres={genres}
          onClose={(created) => {
            setShowCreate(false);
            if (created) setRefreshKey(k => k + 1);
          }}
        />
      )}

      {episodeTarget && (
        <AddEpisodeModal
          novel={episodeTarget}
          onClose={(added) => {
            setEpisodeTarget(null);
            if (added) setRefreshKey(k => k + 1);
          }}
        />
      )}
    </div>
  );
}

export default WriterDashboard;