import { getAccessToken } from "./token";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch, faBook, faUser, faStore,
  faUniversity, faSpinner, faTimes,
  faChevronLeft, faStar
} from "@fortawesome/free-solid-svg-icons";
import { API } from "./config";

const LIMIT = 20;

// Maps our internal state keys to the keys the /search API returns
const API_KEY_MAP = {
  materials: "study-materials",
  users: "users",
  marketplace: "marketplace",
  universities: "universities",
};

async function searchApi(q, type = "all", page = 1) {
  const token = getAccessToken();
  const res = await fetch(`${API}/search?q=${encodeURIComponent(q)}&type=${type}&page=${page}&limit=${LIMIT}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

const TABS = [
  { id: "all", label: "All", icon: faSearch },
  { id: "materials", label: "Materials", icon: faBook },
  { id: "users", label: "Users", icon: faUser },
  { id: "marketplace", label: "Marketplace", icon: faStore },
  { id: "universities", label: "Universities", icon: faUniversity },
];

function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [results, setResults] = useState({ materials: [], users: [], marketplace: [], universities: [] });
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState({ materials: 1, users: 1, marketplace: 1, universities: 1 });
  const [hasMore, setHasMore] = useState({ materials: false, users: false, marketplace: false, universities: false });
  const [loadingMore, setLoadingMore] = useState(null);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const doSearch = useCallback(async (q, type) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await searchApi(q, type, 1);
      const materials = data["study-materials"] || [];
      const users = data.users || [];
      const marketplace = data.marketplace || [];
      const universities = data.universities || [];
      setResults({ materials, users, marketplace, universities });
      setPage({ materials: 1, users: 1, marketplace: 1, universities: 1 });
      setHasMore({
        materials: materials.length === LIMIT,
        users: users.length === LIMIT,
        marketplace: marketplace.length === LIMIT,
        universities: universities.length === LIMIT,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async (category) => {
    setLoadingMore(category);
    try {
      const nextPage = page[category] + 1;
      const data = await searchApi(query, activeTab, nextPage);
      const newItems = data[API_KEY_MAP[category]] || [];
      setResults(prev => ({ ...prev, [category]: [...prev[category], ...newItems] }));
      setPage(prev => ({ ...prev, [category]: nextPage }));
      setHasMore(prev => ({ ...prev, [category]: newItems.length === LIMIT }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(null);
    }
  }, [query, activeTab, page]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      clearTimeout(debounceRef.current);
      queueMicrotask(() => {
        setResults({ materials: [], users: [], marketplace: [], universities: [] });
        setHasSearched(false);
      });
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query, activeTab), 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, activeTab, doSearch]);

  const total = results.materials.length + results.users.length + results.marketplace.length + results.universities.length;

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="bg-bg/80 backdrop-blur-md border-b border-ink/5 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-ink/40 hover:text-violet-400 transition">
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <div className="flex-1 relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30 text-sm" />
            <input
              ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search everything..."
              className="w-full pl-9 pr-9 py-2.5 bg-white/5 border border-ink/10 rounded-xl text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/40 transition"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60 transition">
                <FontAwesomeIcon icon={faTimes} className="text-xs" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto flex gap-2 overflow-x-auto mt-3 pb-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition border ${activeTab === tab.id ? "bg-violet-500 text-white border-violet-500" : "bg-white/[0.03] border-ink/10 text-ink/50 hover:border-violet-500/30 hover:text-violet-400"}`}>
              <FontAwesomeIcon icon={tab.icon} /> {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-5">
        {loading && <div className="text-center py-10 text-violet-400"><FontAwesomeIcon icon={faSpinner} spin className="text-2xl" /></div>}

        {!loading && !hasSearched && (
          <div className="text-center py-20">
            <p className="text-5xl text-ink/10 mb-3"><FontAwesomeIcon icon={faSearch} /></p>
            <p className="text-ink/40 font-medium">Search for anything</p>
            <p className="text-ink/20 text-sm mt-1">Materials, users, listings, universities</p>
          </div>
        )}

        {!loading && hasSearched && total === 0 && (
          <div className="text-center py-20">
            <p className="text-ink/40 font-medium">No results for "{query}"</p>
            <p className="text-ink/20 text-sm mt-1">Try a different keyword or filter</p>
          </div>
        )}

        {!loading && total > 0 && (
          <div className="space-y-6">
            <p className="text-xs text-ink/30">{total} result{total !== 1 ? "s" : ""} for "{query}"</p>

            {/* Study Materials */}
            {results.materials.length > 0 && (activeTab === "all" || activeTab === "materials") && (
              <div>
                <p className="text-sm font-semibold text-ink/50 mb-3 flex items-center gap-2"><FontAwesomeIcon icon={faBook} className="text-violet-400" /> Study Materials</p>
                <div className="flex flex-col gap-2">
                  {results.materials.map(m => (
                    <div key={m.id} onClick={() => navigate(`/study-material/${m.id}`)}
                      className="bg-white/[0.03] border border-ink/10 rounded-2xl p-4 flex gap-3 cursor-pointer hover:border-violet-500/20 transition">
                      <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center shrink-0 text-violet-400"><FontAwesomeIcon icon={faBook} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-ink truncate">{m.title}</p>
                        <p className="text-xs text-ink/30 mt-0.5">{m.faculty && <span>{m.faculty} · </span>}{m.university?.shortName && <span>{m.university.shortName} · </span>}{m.user?.displayName}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium self-start ${m.isPublic ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-ink/30"}`}>{m.isPublic ? "Public" : "Private"}</span>
                    </div>
                  ))}
                </div>
                {hasMore.materials && (
                  <button onClick={() => loadMore("materials")} disabled={loadingMore === "materials"}
                    className="w-full mt-3 py-2 text-xs font-medium text-violet-400 border border-violet-500/20 rounded-xl hover:bg-violet-500/5 transition disabled:opacity-50">
                    {loadingMore === "materials" ? <FontAwesomeIcon icon={faSpinner} spin /> : "Load more materials"}
                  </button>
                )}
              </div>
            )}

            {/* Users */}
            {results.users.length > 0 && (activeTab === "all" || activeTab === "users") && (
              <div>
                <p className="text-sm font-semibold text-ink/50 mb-3 flex items-center gap-2"><FontAwesomeIcon icon={faUser} className="text-violet-400" /> Users</p>
                <div className="flex flex-col gap-2">
                  {results.users.map(u => (
                    <div key={u.id} onClick={() => navigate(`/marketplace/seller/${u.id}`)}
                      className="bg-white/[0.03] border border-ink/10 rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-violet-500/20 transition">
                      <img src={u.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${u.displayName}`} className="w-10 h-10 rounded-full object-cover border border-ink/10 shrink-0" alt="" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-ink">{u.displayName}</p>
                        <p className="text-xs text-ink/30 mt-0.5">{u.faculty && <span>{u.faculty} · </span>}{u.university?.shortName}</p>
                      </div>
                      {u.sellerProfile?.rating > 0 && (
                        <span className="flex items-center gap-1 text-xs text-yellow-400 shrink-0"><FontAwesomeIcon icon={faStar} /> {u.sellerProfile.rating.toFixed(1)}</span>
                      )}
                    </div>
                  ))}
                </div>
                {hasMore.users && (
                  <button onClick={() => loadMore("users")} disabled={loadingMore === "users"}
                    className="w-full mt-3 py-2 text-xs font-medium text-violet-400 border border-violet-500/20 rounded-xl hover:bg-violet-500/5 transition disabled:opacity-50">
                    {loadingMore === "users" ? <FontAwesomeIcon icon={faSpinner} spin /> : "Load more users"}
                  </button>
                )}
              </div>
            )}

            {/* Marketplace */}
            {results.marketplace.length > 0 && (activeTab === "all" || activeTab === "marketplace") && (
              <div>
                <p className="text-sm font-semibold text-ink/50 mb-3 flex items-center gap-2"><FontAwesomeIcon icon={faStore} className="text-violet-400" /> Marketplace</p>
                <div className="grid grid-cols-2 gap-3">
                  {results.marketplace.map(item => (
                    <div key={item.id} onClick={() => navigate(`/marketplace/${item.id}`)}
                      className="bg-white/[0.03] border border-ink/10 rounded-2xl overflow-hidden cursor-pointer hover:border-violet-500/20 transition">
                      <div className="h-28 bg-white/5">
                        {item.images?.[0] ? <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-ink/10"><FontAwesomeIcon icon={faStore} className="text-2xl" /></div>}
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-semibold text-ink truncate">{item.title}</p>
                        <p className="text-xs text-violet-400 font-bold mt-0.5">₦{item.price?.toLocaleString()}</p>
                        <p className="text-xs text-ink/30 mt-0.5">{item.user?.displayName}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {hasMore.marketplace && (
                  <button onClick={() => loadMore("marketplace")} disabled={loadingMore === "marketplace"}
                    className="w-full mt-3 py-2 text-xs font-medium text-violet-400 border border-violet-500/20 rounded-xl hover:bg-violet-500/5 transition disabled:opacity-50">
                    {loadingMore === "marketplace" ? <FontAwesomeIcon icon={faSpinner} spin /> : "Load more listings"}
                  </button>
                )}
              </div>
            )}

            {/* Universities */}
            {results.universities.length > 0 && (activeTab === "all" || activeTab === "universities") && (
              <div>
                <p className="text-sm font-semibold text-ink/50 mb-3 flex items-center gap-2"><FontAwesomeIcon icon={faUniversity} className="text-violet-400" /> Universities</p>
                <div className="flex flex-col gap-2">
                  {results.universities.map(u => (
                    <div key={u.id} className="bg-white/[0.03] border border-ink/10 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-violet-500/20 transition">
                      <div>
                        <p className="font-medium text-ink">{u.name}</p>
                        <p className="text-xs text-ink/30 mt-0.5">{u.shortName && <span>{u.shortName} · </span>}{u._count?.users} students</p>
                      </div>
                      {u.isVerified && <span className="shrink-0 px-2 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-full text-xs font-medium">Verified</span>}
                    </div>
                  ))}
                </div>
                {hasMore.universities && (
                  <button onClick={() => loadMore("universities")} disabled={loadingMore === "universities"}
                    className="w-full mt-3 py-2 text-xs font-medium text-violet-400 border border-violet-500/20 rounded-xl hover:bg-violet-500/5 transition disabled:opacity-50">
                    {loadingMore === "universities" ? <FontAwesomeIcon icon={faSpinner} spin /> : "Load more universities"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Search;
