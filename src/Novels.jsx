import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown, faHouse, faBook, faLayerGroup, faRobot, faComments,
  faStore, faBookOpen, faUser, faPenNib, faFeatherPointed,
} from '@fortawesome/free-solid-svg-icons';
import { apiGet } from "./api";

const TAB_LINKS = [
  { href: "/home",           label: "Home",   icon: faHouse },
  { href: "/study-material", label: "Study",  icon: faBook },
  { href: "/flashcards",     label: "Cards",  icon: faLayerGroup },
  { href: "/novels",         label: "Novels", icon: faBookOpen },
  { href: "/ai",             label: "AI",     icon: faRobot },
  { href: "/chat",           label: "Chat",   icon: faComments },
  { href: "/marketplace",    label: "Market", icon: faStore },
];

const GENRE_LABELS = {
  ROMANCE: "Romance", FANTASY: "Fantasy", THRILLER: "Thriller",
  MYSTERY: "Mystery", SCI_FI: "Sci-Fi", HORROR: "Horror",
  DRAMA: "Drama", ADVENTURE: "Adventure", COMEDY: "Comedy",
  ACTION: "Action", HISTORICAL: "Historical", POETRY: "Poetry",
};

// ─── Novel Card ─────────────────────────────────────────────
function NovelCard({ novel }) {
  return (
    <Link
      to={`/novels/${novel.id}`}
      className="bg-white/[0.03] border border-ink/10 rounded-2xl p-4 hover:border-violet-500/30 transition group block"
    >
      <div className="w-full aspect-[3/4] bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center text-violet-400 mb-3 overflow-hidden">
        {novel.coverUrl ? (
          <img src={novel.coverUrl} alt={novel.title} className="w-full h-full object-cover" />
        ) : (
          <FontAwesomeIcon icon={faBookOpen} className="text-3xl opacity-40" />
        )}
      </div>
      <span className="text-xs px-2 py-0.5 bg-violet-500/15 text-violet-400 rounded-full inline-block mb-2">
        {GENRE_LABELS[novel.genre] || novel.genre}
      </span>
      <p className="text-sm font-semibold text-ink mb-1 truncate">{novel.title}</p>
      <p className="text-xs text-ink/30 mb-2 line-clamp-2">{novel.synopsis}</p>
      <div className="flex items-center justify-between text-xs text-ink/20">
        <span>
          <FontAwesomeIcon icon={faUser} className="mr-1" />
          {novel.author?.penName}
        </span>
        <span>{novel._count?.episodes ?? 0} ep</span>
      </div>
    </Link>
  );
}

// ─── Main Component ─────────────────────────────────────────
function Novels() {
const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [novels, setNovels] = useState([]);
  const [genres, setGenres] = useState([]);
  const [activeGenre, setActiveGenre] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/novels/genres").then(setGenres).catch(() => setGenres([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const path = activeGenre ? `/novels?genre=${activeGenre}` : "/novels";
    apiGet(path)
      .then(setNovels)
      .catch(() => setNovels([]))
      .finally(() => setLoading(false));
  }, [activeGenre]);

const isWriter = user?.isWriter;

  return (
    <div className="min-h-screen bg-bg text-ink">

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-500 rounded-full opacity-[0.06] blur-[100px]" />
      </div>

      <header className="fixed top-0 left-0 w-full z-40 bg-bg/80 backdrop-blur-md border-b border-ink/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-3">
              <Link to="/home" className="text-ink/40 hover:text-violet-400 transition">
                <FontAwesomeIcon icon={faChevronDown} className="rotate-90" />
              </Link>
              <h1 className="text-lg font-black tracking-tight">
                TEST<span className="text-violet-400">YOURSELF</span>
                <span className="ml-2 text-xs font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full align-middle">Novels</span>
              </h1>
            </div>

            {isWriter ? (
              <button
                onClick={() => navigate("/writer/dashboard")}
                className="flex items-center gap-2 bg-violet-500 hover:bg-violet-400 text-white px-4 py-2 rounded-full text-sm font-medium transition"
              >
                <FontAwesomeIcon icon={faPenNib} />
                Writer Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate("/novels/become-writer")}
                className="flex items-center gap-2 bg-white/5 border border-ink/10 hover:border-violet-500/40 text-ink/70 hover:text-violet-400 px-4 py-2 rounded-full text-sm font-medium transition"
              >
                <FontAwesomeIcon icon={faFeatherPointed} />
                Become a Writer
              </button>
            )}
          </div>

          <div className="flex items-center justify-around border-t border-ink/5 px-2 overflow-x-auto">
            {TAB_LINKS.map((t) => {
              const isActive = location.pathname === t.href;
              return (
                <Link key={t.href} to={t.href}
                  className={`flex flex-col items-center py-2 px-4 border-b-2 transition text-xs gap-0.5 shrink-0 ${
                    isActive ? "border-violet-500 text-violet-400" : "border-transparent text-ink/30 hover:text-ink/60"
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

        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveGenre(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition border shrink-0 ${
              !activeGenre ? "bg-violet-500 text-white border-violet-500" : "bg-white/[0.03] border-ink/10 text-ink/50"
            }`}
          >
            All Genres
          </button>
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setActiveGenre(g)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition border shrink-0 ${
                activeGenre === g ? "bg-violet-500 text-white border-violet-500" : "bg-white/[0.03] border-ink/10 text-ink/50"
              }`}
            >
              {GENRE_LABELS[g] || g}
            </button>
          ))}
        </div>

        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white/[0.03] border border-ink/10 rounded-2xl p-4 animate-pulse h-64" />
            ))}
          </div>
        )}

        {!loading && novels.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4 text-ink/10"><FontAwesomeIcon icon={faBookOpen} /></p>
            <p className="text-ink/40 font-medium">No novels yet</p>
            <p className="text-ink/20 text-sm mt-1">
              {activeGenre ? "Try a different genre." : "Be the first to publish a story."}
            </p>
          </div>
        )}

        {!loading && novels.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {novels.map(novel => (
              <NovelCard key={novel.id} novel={novel} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Novels;