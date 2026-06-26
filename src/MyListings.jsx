import { getAccessToken } from "./token";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft, faPlus, faBoxOpen,
  faEdit, faTrash, faStore, faCheckCircle, faXmark
} from "@fortawesome/free-solid-svg-icons";
import { API } from "./config";

async function apiFetch(path, options = {}) {
  const token = getAccessToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function MyListings() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    apiFetch("/marketplace/my").then(setListings).catch(console.error).finally(() => setLoading(false));
  }, []);

  const deleteListing = async (id) => {
    try { await apiFetch(`/marketplace/${id}`, { method: "DELETE" }); setListings(prev => prev.filter(l => l.id !== id)); }
    catch (err) { console.error(err); }
  };

  const markAsSold = async (id) => {
    try {
      await apiFetch(`/marketplace/${id}`, { method: "PATCH", body: JSON.stringify({ status: "SOLD" }) });
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: "SOLD" } : l));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/marketplace")} className="text-white/40 hover:text-violet-400 transition">
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <FontAwesomeIcon icon={faStore} className="text-violet-400" /> My Listings
            </h1>
          </div>
          <button onClick={() => navigate("/marketplace/create")} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-sm transition">
            <FontAwesomeIcon icon={faPlus} /> New
          </button>
        </div>
      </header>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-5">
        {/* Seller onboarding */}
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-violet-400">Set up your seller profile</p>
            <p className="text-xs text-violet-400/60 mt-0.5">Add your ChatSnap username so buyers can contact you</p>
          </div>
          <button onClick={() => navigate("/marketplace/onboarding")} className="px-3 py-1.5 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-xs font-medium transition whitespace-nowrap">
            Set Up
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-violet-400">Loading...</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3 text-white/10"><FontAwesomeIcon icon={faBoxOpen} /></p>
            <p className="text-white/40 font-medium">No listings yet</p>
            <p className="text-white/20 text-sm mt-1">Start selling something!</p>
            <button onClick={() => navigate("/marketplace/create")} className="mt-4 px-5 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-sm transition">
              Create Listing
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {listings.map(item => (
              <div key={item.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex gap-4 hover:border-violet-500/20 transition">
                {/* Image */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/5 shrink-0">
                  {item.images?.[0]
                    ? <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-white/10"><FontAwesomeIcon icon={faBoxOpen} className="text-2xl" /></div>
                  }
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-white truncate">{item.title}</p>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${item.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-400" : item.status === "SOLD" ? "bg-pink-500/15 text-pink-400" : "bg-white/5 text-white/40"}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-violet-400 font-bold text-sm mt-0.5">₦{item.price?.toLocaleString()}</p>
                  <p className="text-xs text-white/20 mt-0.5">{new Date(item.createdAt).toLocaleDateString()}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {item.status === "ACTIVE" && (
                      <button onClick={() => markAsSold(item.id)} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition">
                        <FontAwesomeIcon icon={faCheckCircle} /> Mark Sold
                      </button>
                    )}
                    <button onClick={() => navigate(`/marketplace/${item.id}`)} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-medium transition">
                      <FontAwesomeIcon icon={faEdit} /> View
                    </button>
                    <button onClick={() => setConfirm(item.id)} className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 font-medium transition">
                      <FontAwesomeIcon icon={faTrash} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Delete */}
      {confirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d14] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="text-white/70 text-sm mb-5">Are you sure you want to delete this listing? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="flex-1 py-2 rounded-xl border border-white/10 text-sm text-white/50 hover:border-white/20 transition">Cancel</button>
              <button onClick={() => { deleteListing(confirm); setConfirm(null); }} className="flex-1 py-2 rounded-xl bg-pink-500/80 hover:bg-pink-500 text-white text-sm transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyListings;

