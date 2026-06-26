import { getAccessToken } from "./token";
import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { auth } from "./firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch, faPlus, faList, faStore, faFilter, faTag, faBoxOpen, faTimes, faStar,
  faHouse, faBook, faRobot, faComments, faChevronLeft,
} from "@fortawesome/free-solid-svg-icons";
import { API } from "./config";

const TAB_LINKS = [
  { href: "/home",          label: "Home",   icon: faHouse },
  { href: "/study-material",label: "Study",  icon: faBook },
  { href: "/ai",            label: "AI",     icon: faRobot },
  { href: "/chat",          label: "Chat",   icon: faComments },
  { href: "/marketplace",   label: "Market", icon: faStore },
];

async function apiFetch(path, options = {}) {
  const token = getAccessToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const CATEGORIES = ["Books", "Electronics", "Clothing", "Furniture", "Food", "Services", "Digital", "Other"];
const CONDITIONS = ["NEW", "GOOD", "FAIR", "POOR"];
const TYPES = ["PHYSICAL", "DIGITAL", "SERVICE"];

function ListingCard({ item, onClick }) {
  const avgRating = item.reviews?.length
    ? (item.reviews.reduce((s, r) => s + r.rating, 0) / item.reviews.length).toFixed(1) : null;
  return (
    <div onClick={onClick} className="bg-white/[0.03] border border-white/10 rounded-2xl hover:border-violet-500/30 hover:bg-violet-500/5 transition cursor-pointer overflow-hidden">
      <div className="h-40 bg-white/5 overflow-hidden">
        {item.images?.[0]
          ? <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-white/10"><FontAwesomeIcon icon={faBoxOpen} className="text-4xl" /></div>}
      </div>
      <div className="p-3">
        <p className="font-semibold text-white truncate">{item.title}</p>
        <p className="text-violet-400 font-bold text-sm mt-0.5">₦{item.price?.toLocaleString()}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-white/30">{item.user?.displayName}</span>
          <div className="flex items-center gap-2">
            {avgRating && <span className="text-xs text-yellow-400 flex items-center gap-0.5"><FontAwesomeIcon icon={faStar} /> {avgRating}</span>}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.type === "DIGITAL" ? "bg-violet-500/15 text-violet-400" : item.type === "SERVICE" ? "bg-blue-500/15 text-blue-400" : "bg-white/5 text-white/40"}`}>{item.type}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Marketplace() {
  const navigate = useNavigate();
  const location = useLocation();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ category: "", type: "", condition: "", minPrice: "", maxPrice: "" });

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filters.category) params.set("category", filters.category);
      if (filters.type) params.set("type", filters.type);
      if (filters.condition) params.set("condition", filters.condition);
      if (filters.minPrice) params.set("minPrice", filters.minPrice);
      if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
      setListings(await apiFetch(`/marketplace?${params.toString()}`));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try { setListings(await apiFetch("/marketplace")); } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, []);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-pink-500 rounded-full opacity-[0.06] blur-[100px]" />
      </div>

      <header className="fixed top-0 left-0 w-full z-40 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-3">
              <Link to="/home" className="text-white/40 hover:text-violet-400 transition">
                <FontAwesomeIcon icon={faChevronLeft} />
              </Link>
              <h1 className="text-lg font-black tracking-tight">
                TEST<span className="text-violet-400">YOURSELF</span>
                <span className="ml-2 text-xs font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full align-middle">Market</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate("/marketplace/my-listings")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-sm text-white/50 hover:border-violet-500/30 hover:text-violet-400 transition">
                <FontAwesomeIcon icon={faList} /> My Listings
              </button>
              <button onClick={() => navigate("/marketplace/create")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500 hover:bg-violet-400 text-white text-sm transition">
                <FontAwesomeIcon icon={faPlus} /> Sell
              </button>
            </div>
          </div>
          <div className="flex items-center justify-around border-t border-white/5 px-2">
            {TAB_LINKS.map((tab) => {
              const isActive = location.pathname === tab.href;
              return (
                <Link key={tab.href} to={tab.href} className={`flex flex-col items-center py-2 px-4 border-b-2 transition text-xs gap-0.5 ${isActive ? "border-violet-500 text-violet-400" : "border-transparent text-white/30 hover:text-white/60"}`}>
                  <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-28 pb-10">
        {/* Search */}
        <form onSubmit={(e) => { e.preventDefault(); fetchListings(); }} className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search listings..."
              className="w-full pl-9 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/40 transition" />
          </div>
          <button type="button" onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm transition ${activeFilterCount > 0 ? "bg-violet-500 text-white border-violet-500" : "border-white/10 text-white/50 hover:border-violet-500/30"}`}>
            <FontAwesomeIcon icon={faFilter} />
            {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
          </button>
          <button type="submit" className="px-4 py-2.5 bg-violet-500 hover:bg-violet-400 text-white rounded-xl text-sm transition">Search</button>
        </form>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-[#0d0d14] border border-white/10 rounded-2xl p-4 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Category", key: "category", options: CATEGORIES },
                { label: "Type", key: "type", options: TYPES },
                { label: "Condition", key: "condition", options: CONDITIONS },
              ].map(({ label, key, options }) => (
                <div key={key}>
                  <label className="text-xs text-white/30 mb-1 block">{label}</label>
                  <select value={filters[key]} onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/70 outline-none focus:border-violet-500/40 transition">
                    <option value="">All</option>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              {[{ label: "Min Price (₦)", key: "minPrice", placeholder: "0" }, { label: "Max Price (₦)", key: "maxPrice", placeholder: "Any" }].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-white/30 mb-1 block">{label}</label>
                  <input type="number" value={filters[key]} onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/40 transition" />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3">
              <button onClick={() => { setFilters({ category: "", type: "", condition: "", minPrice: "", maxPrice: "" }); setSearch(""); }} className="text-xs text-white/30 hover:text-pink-400 flex items-center gap-1 transition">
                <FontAwesomeIcon icon={faTimes} /> Clear filters
              </button>
              <button onClick={() => { fetchListings(); setShowFilters(false); }} className="px-4 py-1.5 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-xs transition">Apply</button>
            </div>
          </div>
        )}

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => { setFilters(f => ({ ...f, category: f.category === cat ? "" : cat })); fetchListings(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition border ${filters.category === cat ? "bg-violet-500 text-white border-violet-500" : "bg-white/[0.03] border-white/10 text-white/50 hover:border-violet-500/30 hover:text-violet-400"}`}>
              <FontAwesomeIcon icon={faTag} /> {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-violet-400">Loading...</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3 text-white/10"><FontAwesomeIcon icon={faBoxOpen} /></p>
            <p className="text-white/40 font-medium">No listings found</p>
            <p className="text-white/20 text-sm mt-1">Be the first to sell something!</p>
            <button onClick={() => navigate("/marketplace/create")} className="mt-4 px-5 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-sm transition">Create Listing</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map(item => <ListingCard key={item.id} item={item} onClick={() => navigate(`/marketplace/${item.id}`)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default Marketplace;

