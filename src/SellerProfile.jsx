import { getAccessToken } from "./token";
// ── SellerProfile.jsx ─────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth } from "./firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faBoxOpen, faStar, faStore, faCommentDots, faUser } from "@fortawesome/free-solid-svg-icons";
import { API } from "./config";

async function apiFetch(path, options = {}) {
  const token = getAccessToken();
  const res = await fetch(`${API}${path}`, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function SellerProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiFetch(`/marketplace/seller/${userId}`), apiFetch(`/marketplace?universityId=`)])
      .then(([profileData, allListings]) => {
        setProfile(profileData);
        setListings(allListings.filter(l => l.user?.id === userId));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-violet-400">Loading...</div>;

  if (!profile) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center">
        <p className="text-5xl text-white/10 mb-3"><FontAwesomeIcon icon={faUser} /></p>
        <p className="text-white/40 font-medium">Seller profile not found</p>
        <button onClick={() => navigate("/marketplace")} className="mt-4 px-5 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-sm transition">Back to Marketplace</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none"><div className="absolute -top-32 -right-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" /></div>

      <header className="bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white/40 hover:text-violet-400 transition"><FontAwesomeIcon icon={faChevronLeft} /></button>
          <h1 className="text-base font-bold text-white">Seller Profile</h1>
        </div>
      </header>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Profile Card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <img src={profile.user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.user?.displayName}`} className="w-16 h-16 rounded-full object-cover border-2 border-violet-500/30" alt="" />
            <div className="flex-1">
              <p className="text-lg font-bold text-white">{profile.user?.displayName}</p>
              {profile.user?.university?.shortName && <p className="text-xs text-white/30 mt-0.5">{profile.user.university.shortName}</p>}
              {profile.rating > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {[1,2,3,4,5].map(s => <FontAwesomeIcon key={s} icon={faStar} className={`text-sm ${s <= Math.round(profile.rating) ? "text-yellow-400" : "text-white/10"}`} />)}
                  <span className="text-xs text-white/30 ml-1">{profile.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
            {profile.totalSales > 0 && (
              <div className="text-center">
                <p className="text-xl font-bold text-violet-400">{profile.totalSales}</p>
                <p className="text-xs text-white/30">Sales</p>
              </div>
            )}
          </div>
          {profile.bio && <p className="text-sm text-white/40 mt-4 leading-relaxed">{profile.bio}</p>}
          <div className="flex gap-2 mt-4">
            {profile.chatSnapUsername && (
              <button onClick={() => navigate(`/chat?user=${profile.chatSnapUsername}`)} className="flex items-center gap-1.5 px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-xl text-sm font-medium transition">
                <FontAwesomeIcon icon={faCommentDots} /> Chat on ChatSnap
              </button>
            )}
            {profile.whatsapp && (
              <a href={`https://wa.me/${profile.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition">
                WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Listings */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <p className="text-sm font-semibold text-white/50 mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faStore} className="text-violet-400" /> Listings ({listings.length})
          </p>
          {listings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl text-white/10 mb-2"><FontAwesomeIcon icon={faBoxOpen} /></p>
              <p className="text-white/30 text-sm">No active listings</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {listings.map(item => (
                <div key={item.id} onClick={() => navigate(`/marketplace/${item.id}`)} className="cursor-pointer rounded-xl border border-white/10 overflow-hidden hover:border-violet-500/30 hover:bg-violet-500/5 transition">
                  <div className="h-28 bg-white/5">
                    {item.images?.[0]
                      ? <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-white/10"><FontAwesomeIcon icon={faBoxOpen} className="text-2xl" /></div>}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                    <p className="text-xs text-violet-400 font-bold mt-0.5">₦{item.price?.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SellerProfile;

