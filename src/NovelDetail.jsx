import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown, faBookOpen, faUser, faLock, faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';
import { apiGet } from "./api";

const GENRE_LABELS = {
  ROMANCE: "Romance", FANTASY: "Fantasy", THRILLER: "Thriller",
  MYSTERY: "Mystery", SCI_FI: "Sci-Fi", HORROR: "Horror",
  DRAMA: "Drama", ADVENTURE: "Adventure", COMEDY: "Comedy",
  ACTION: "Action", HISTORICAL: "Historical", POETRY: "Poetry",
};

const STATUS_LABELS = {
  ONGOING: { label: "Ongoing", color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" },
  COMPLETED: { label: "Completed", color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
  HIATUS: { label: "On Hiatus", color: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
};

const formatDate = (ts) => {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

function NovelDetail() {
  const { id } = useParams();
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiGet(`/novels/${id}`)
      .then(setNovel)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-500 rounded-full opacity-[0.06] blur-[100px]" />
      </div>

      <header className="fixed top-0 left-0 w-full z-40 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3">
          <Link to="/novels" className="text-white/40 hover:text-violet-400 transition">
            <FontAwesomeIcon icon={faChevronDown} className="rotate-90" />
          </Link>
          <h1 className="text-lg font-black tracking-tight">
            TEST<span className="text-violet-400">YOURSELF</span>
          </h1>
        </div>
      </header>

      <main className="relative z-10 pt-24 px-4 pb-10 max-w-3xl mx-auto">
        {loading && (
          <div className="animate-pulse">
            <div className="h-48 bg-white/[0.03] border border-white/10 rounded-2xl mb-4" />
            <div className="h-6 bg-white/[0.03] rounded w-1/2 mb-2" />
            <div className="h-4 bg-white/[0.03] rounded w-3/4" />
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4 text-white/10"><FontAwesomeIcon icon={faBookOpen} /></p>
            <p className="text-white/40 font-medium">Couldn't find this novel</p>
            <Link to="/novels" className="mt-4 inline-block px-6 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-sm transition">
              Back to Browse
            </Link>
          </div>
        )}

        {!loading && novel && (
          <>
            <div className="flex gap-5 mb-6">
              <div className="w-28 h-36 shrink-0 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex items-center justify-center text-violet-400 overflow-hidden">
                {novel.coverUrl ? (
                  <img src={novel.coverUrl} alt={novel.title} className="w-full h-full object-cover" />
                ) : (
                  <FontAwesomeIcon icon={faBookOpen} className="text-3xl opacity-40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 bg-violet-500/15 text-violet-400 rounded-full">
                    {GENRE_LABELS[novel.genre] || novel.genre}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_LABELS[novel.status]?.color}`}>
                    {STATUS_LABELS[novel.status]?.label || novel.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mb-1">{novel.title}</h2>
                <p className="text-xs text-white/30 mb-3 flex items-center gap-1.5">
                {novel.author?.writerAvatarUrl ? (
                  <img src={novel.author.writerAvatarUrl} alt={novel.author.penName} className="w-4 h-4 rounded-full object-cover" />
                ) : (
                  <FontAwesomeIcon icon={faUser} className="text-white/20" />
                )}
                  <FontAwesomeIcon icon={faUser} className="mr-1" />
                {novel.author?.penName}
                </p>
                <p className="text-sm text-white/50 leading-relaxed">{novel.synopsis}</p>
              </div>
            </div>

            <p className="text-xs text-white/30 uppercase tracking-wide font-semibold mb-3">
              Episodes ({novel.episodes?.length || 0})
            </p>

            {novel.episodes?.length === 0 && (
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-center text-white/30 text-sm">
                No episodes released yet.
              </div>
            )}

            <div className="space-y-2">
              {novel.episodes?.map((ep) => (
                <Link
                  key={ep.id}
                  to={`/episodes/${ep.id}`}
                  className="flex items-center justify-between bg-white/[0.03] border border-white/10 hover:border-violet-500/30 rounded-2xl px-4 py-3 transition group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      Ep. {ep.episodeNumber} — {ep.title}
                    </p>
                    <p className="text-xs text-white/20">{formatDate(ep.releasedAt)}</p>
                  </div>
                  <FontAwesomeIcon icon={faCircleCheck} className="text-white/10 group-hover:text-violet-400 transition shrink-0 ml-3" />
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default NovelDetail;