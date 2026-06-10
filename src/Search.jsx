import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { getIdToken } from "firebase/auth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch, faBook, faUser, faStore,
  faUniversity, faSpinner, faTimes,
  faChevronLeft, faStar
} from "@fortawesome/free-solid-svg-icons";
import { API } from "./config";

async function searchApi(q, type = "all") {
  const token = await getIdToken(auth.currentUser, true);
  const res = await fetch(`${API}/search?q=${encodeURIComponent(q)}&type=${type}`, {
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
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults({ materials: [], users: [], marketplace: [], universities: [] });
      setHasSearched(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query, activeTab), 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, activeTab]);

  const doSearch = async (q, type) => {
    setLoading(true); setHasSearched(true);
    try {
      const data = await searchApi(q, type);
      setResults({ materials: data.materials || [], users: data.users || [], marketplace: data.marketplace || [], universities: data.universities || [] });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const total = results.materials.length + results.users.length + results.marketplace.length + results.universities.length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white/40 hover:text-violet-400 transition">
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <div className="flex-1 relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm" />
            <input
              ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search everything..."
              className="w-full pl-9 pr-9 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/40 transition"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition">
                <FontAwesomeIcon icon={faTimes} className="text-xs" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto flex gap-2 overflow-x-auto mt-3 pb-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition border ${activeTab === tab.id ? "bg-violet-500 text-white border-violet-500" : "bg-white/[0.03] border-white/10 text-white/50 hover:border-violet-500/30 hover:text-violet-400"}`}>
              <FontAwesomeIcon icon={tab.icon} /> {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-5">
        {loading && <div className="text-center py-10 text-violet-400"><FontAwesomeIcon icon={faSpinner} spin className="text-2xl" /></div>}

        {!loading && !hasSearched && (
          <div className="text-center py-20">
            <p className="text-5xl text-white/10 mb-3"><FontAwesomeIcon icon={faSearch} /></p>
            <p className="text-white/40 font-medium">Search for anything</p>
            <p className="text-white/20 text-sm mt-1">Materials, users, listings, universities</p>
          </div>
        )}

        {!loading && hasSearched && total === 0 && (
          <div className="text-center py-20">
            <p className="text-white/40 font-medium">No results for "{query}"</p>
            <p className="text-white/20 text-sm mt-1">Try a different keyword or filter</p>
          </div>
        )}

        {!loading && total > 0 && (
          <div className="space-y-6">
            <p className="text-xs text-white/30">{total} result{total !== 1 ? "s" : ""} for "{query}"</p>

            {/* Study Materials */}
            {results.materials.length > 0 && (activeTab === "all" || activeTab === "materials") && (
              <div>
                <p className="text-sm font-semibold text-white/50 mb-3 flex items-center gap-2"><FontAwesomeIcon icon={faBook} className="text-violet-400" /> Study Materials</p>
                <div className="flex flex-col gap-2">
                  {results.materials.map(m => (
                    <div key={m.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex gap-3 hover:border-violet-500/20 transition">
                      <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center shrink-0 text-violet-400"><FontAwesomeIcon icon={faBook} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{m.title}</p>
                        <p className="text-xs text-white/30 mt-0.5">{m.faculty && <span>{m.faculty} · </span>}{m.university?.shortName && <span>{m.university.shortName} · </span>}{m.user?.displayName}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium self-start ${m.isPublic ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-white/30"}`}>{m.isPublic ? "Public" : "Private"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users */}
            {results.users.length > 0 && (activeTab === "all" || activeTab === "users") && (
              <div>
                <p className="text-sm font-semibold text-white/50 mb-3 flex items-center gap-2"><FontAwesomeIcon icon={faUser} className="text-violet-400" /> Users</p>
                <div className="flex flex-col gap-2">
                  {results.users.map(u => (
                    <div key={u.id} onClick={() => navigate(`/marketplace/seller/${u.id}`)}
                      className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-violet-500/20 transition">
                      <img src={u.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${u.displayName}`} className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0" alt="" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white">{u.displayName}</p>
                        <p className="text-xs text-white/30 mt-0.5">{u.faculty && <span>{u.faculty} · </span>}{u.university?.shortName}</p>
                      </div>
                      {u.sellerProfile?.rating > 0 && (
                        <span className="flex items-center gap-1 text-xs text-yellow-400 shrink-0"><FontAwesomeIcon icon={faStar} /> {u.sellerProfile.rating.toFixed(1)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Marketplace */}
            {results.marketplace.length > 0 && (activeTab === "all" || activeTab === "marketplace") && (
              <div>
                <p className="text-sm font-semibold text-white/50 mb-3 flex items-center gap-2"><FontAwesomeIcon icon={faStore} className="text-violet-400" /> Marketplace</p>
                <div className="grid grid-cols-2 gap-3">
                  {results.marketplace.map(item => (
                    <div key={item.id} onClick={() => navigate(`/marketplace/${item.id}`)}
                      className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:border-violet-500/20 transition">
                      <div className="h-28 bg-white/5">
                        {item.images?.[0] ? <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/10"><FontAwesomeIcon icon={faStore} className="text-2xl" /></div>}
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                        <p className="text-xs text-violet-400 font-bold mt-0.5">₦{item.price?.toLocaleString()}</p>
                        <p className="text-xs text-white/30 mt-0.5">{item.user?.displayName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Universities */}
            {results.universities.length > 0 && (activeTab === "all" || activeTab === "universities") && (
              <div>
                <p className="text-sm font-semibold text-white/50 mb-3 flex items-center gap-2"><FontAwesomeIcon icon={faUniversity} className="text-violet-400" /> Universities</p>
                <div className="flex flex-col gap-2">
                  {results.universities.map(u => (
                    <div key={u.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-violet-500/20 transition">
                      <div>
                        <p className="font-medium text-white">{u.name}</p>
                        <p className="text-xs text-white/30 mt-0.5">{u.shortName && <span>{u.shortName} · </span>}{u._count?.users} students</p>
                      </div>
                      {u.isVerified && <span className="shrink-0 px-2 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-full text-xs font-medium">Verified</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Search;