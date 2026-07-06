import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown, faChevronLeft, faChevronRight, faBookOpen,
} from '@fortawesome/free-solid-svg-icons';
import { apiGet } from "./api";

function EpisodeReader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [episode, setEpisode] = useState(null);
  const [siblingEpisodes, setSiblingEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    apiGet(`/episodes/${id}`)
      .then(async (ep) => {
        setEpisode(ep);
        // fetch the parent novel to get the ordered episode list for prev/next nav
        const novel = await apiGet(`/novels/${ep.novel.id}`);
        setSiblingEpisodes(novel.episodes || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const currentIndex = siblingEpisodes.findIndex(e => e.id === id);
  const prevEpisode = currentIndex > 0 ? siblingEpisodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex >= 0 && currentIndex < siblingEpisodes.length - 1
    ? siblingEpisodes[currentIndex + 1]
    : null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-500 rounded-full opacity-[0.06] blur-[100px]" />
      </div>

      <header className="fixed top-0 left-0 w-full z-40 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
          <Link to={episode ? `/novels/${episode.novel.id}` : "/novels"} className="text-white/40 hover:text-violet-400 transition">
            <FontAwesomeIcon icon={faChevronDown} className="rotate-90" />
          </Link>
          <h1 className="text-sm font-semibold text-white/60 truncate">
            {episode?.novel?.title}
          </h1>
        </div>
      </header>

      <main className="relative z-10 pt-24 px-4 pb-24 max-w-2xl mx-auto">
        {loading && (
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-white/[0.03] rounded w-1/2" />
            <div className="h-4 bg-white/[0.03] rounded w-full" />
            <div className="h-4 bg-white/[0.03] rounded w-full" />
            <div className="h-4 bg-white/[0.03] rounded w-3/4" />
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4 text-white/10"><FontAwesomeIcon icon={faBookOpen} /></p>
            <p className="text-white/40 font-medium">Couldn't load this episode</p>
            <Link to="/novels" className="mt-4 inline-block px-6 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-sm transition">
              Back to Browse
            </Link>
          </div>
        )}

        {!loading && episode && (
          <>
            <p className="text-xs text-violet-400 uppercase tracking-wide font-semibold mb-1">
              Episode {episode.episodeNumber}
            </p>
            <h2 className="text-2xl font-bold text-white mb-6">{episode.title}</h2>

            <div className="text-white/70 text-[15px] leading-loose whitespace-pre-wrap">
              {episode.content}
            </div>
          </>
        )}
      </main>

      {!loading && episode && (
        <div className="fixed bottom-0 left-0 w-full bg-[#0a0a0f]/90 backdrop-blur-md border-t border-white/5 z-40">
          <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3 gap-3">
            <button
              onClick={() => prevEpisode && navigate(`/episodes/${prevEpisode.id}`)}
              disabled={!prevEpisode}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 disabled:opacity-30 hover:border-violet-500/40 text-white/70 hover:text-violet-400 rounded-xl text-sm transition"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
              Prev
            </button>
            <button
              onClick={() => nextEpisode && navigate(`/episodes/${nextEpisode.id}`)}
              disabled={!nextEpisode}
              className="flex items-center gap-2 px-4 py-2 bg-violet-500/15 border border-violet-500/30 disabled:opacity-30 hover:bg-violet-500/25 text-violet-400 rounded-xl text-sm transition"
            >
              Next
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EpisodeReader;