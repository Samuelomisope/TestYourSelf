import { getAccessToken } from "./token";
// ── SellerProfile.jsx ─────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth } from "./firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faBoxOpen, faStar, faStore, faCommentDots, faUser, faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { API } from "./config";

async function apiFetch(path, options = {}) {
  const token = getAccessToken();
  const res = await fetch(`${API}${path}`, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Threshold for the "Trusted Seller" badge — tune these once you see
// real distribution of ratings/sales across your seller base.
const TRUSTED_MIN_RATING = 4.5;
const TRUSTED_MIN_SALES = 5;

function TrustBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-medium">
      <FontAwesomeIcon icon={faCircleCheck} className="text-[11px]" />
      Trusted Seller
    </span>
  );
}

function SellerProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiFetch(`/marketplace/seller/${userId}`), apiFetch(`/marketplace?universityId=`)])
      .then(([profileData, allListings]) => {
        setProfile(profileData);
        setListings(allListings.filter(l => l.user?.id === userId));
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    apiFetch(`/marketplace/seller/${userId}/reviews`).then(setReviews).catch(console.error);
  }, [userId]);

  if (loading) return <div className="min-h-screen bg-bg flex items-center justify-center text-violet-400">Loading...</div>;

  if (!profile) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <p className="text-5xl text-ink/10 mb-3"><FontAwesomeIcon icon={faUser} /></p>
        <p className="text-ink/40 font-medium">Seller profile not found</p>
        <button onClick={() => navigate("/marketplace")} className="mt-4 px-5 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-sm transition">Back to Marketplace</button>
      </div>
    </div>
  );

  const isTrusted = profile.rating >= TRUSTED_MIN_RATING && profile.totalSales >= TRUSTED_MIN_SALES;
  // Recommend rate: reviews rated 4+ stars, as a % of all reviews.
  // Falls back gracefully to null until the reviews list is wired in.
  const recommendPct = reviews.length > 0
    ? Math.round((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100)
    : null;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="fixed inset-0 pointer-events-none"><div className="absolute -top-32 -right-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" /></div>

      <header className="bg-bg/80 backdrop-blur-md border-b border-ink/5 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-ink/40 hover:text-violet-400 transition"><FontAwesomeIcon icon={faChevronLeft} /></button>
          <h1 className="text-base font-bold text-ink">Seller Profile</h1>
        </div>
      </header>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Profile Card */}
        <div className="bg-white/[0.03] border border-ink/10 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <img src={profile.user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.user?.displayName}`} className="w-16 h-16 rounded-full object-cover border-2 border-violet-500/30" alt="" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-lg font-bold text-ink">{profile.user?.displayName}</p>
                {isTrusted && <TrustBadge />}
              </div>
              {profile.user?.university?.shortName && <p className="text-xs text-ink/30 mt-0.5">{profile.user.university.shortName}</p>}
              {profile.rating > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {[1,2,3,4,5].map(s => <FontAwesomeIcon key={s} icon={faStar} className={`text-sm ${s <= Math.round(profile.rating) ? "text-yellow-400" : "text-ink/10"}`} />)}
                  <span className="text-xs text-ink/30 ml-1">
                    {profile.rating.toFixed(1)}
                    {reviews.length > 0 && ` (${reviews.length} review${reviews.length === 1 ? "" : "s"})`}
                  </span>
                </div>
              )}
              {recommendPct !== null && (
                <p className="text-xs text-emerald-400 mt-1">{recommendPct}% of buyers recommend this seller</p>
              )}
            </div>
            {profile.totalSales > 0 && (
              <div className="text-center">
                <p className="text-xl font-bold text-violet-400">{profile.totalSales}</p>
                <p className="text-xs text-ink/30">Sales</p>
              </div>
            )}
          </div>
          {profile.bio && <p className="text-sm text-ink/40 mt-4 leading-relaxed">{profile.bio}</p>}
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

        {/* Reviews — populated once the reviews endpoint is wired in above */}
        {reviews.length > 0 && (
          <div className="bg-white/[0.03] border border-ink/10 rounded-2xl p-5">
            <p className="text-sm font-semibold text-ink/50 mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faStar} className="text-yellow-400" /> Reviews ({reviews.length})
            </p>
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-ink/5 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-ink">{review.user?.displayName || "Anonymous"}</p>
                      {review.item?.title && <p className="text-[11px] text-ink/25">on {review.item.title}</p>}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(s => <FontAwesomeIcon key={s} icon={faStar} className={`text-xs ${s <= review.rating ? "text-yellow-400" : "text-ink/10"}`} />)}
                    </div>
                  </div>
                  {review.comment && <p className="text-xs text-ink/40 mt-1">{review.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Listings */}
        <div className="bg-white/[0.03] border border-ink/10 rounded-2xl p-5">
          <p className="text-sm font-semibold text-ink/50 mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faStore} className="text-violet-400" /> Listings ({listings.length})
          </p>
          {listings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl text-ink/10 mb-2"><FontAwesomeIcon icon={faBoxOpen} /></p>
              <p className="text-ink/30 text-sm">No active listings</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {listings.map(item => (
                <div key={item.id} onClick={() => navigate(`/marketplace/${item.id}`)} className="cursor-pointer rounded-xl border border-ink/10 overflow-hidden hover:border-violet-500/30 hover:bg-violet-500/5 transition">
                  <div className="h-28 bg-white/5">
                    {item.images?.[0]
                      ? <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-ink/10"><FontAwesomeIcon icon={faBoxOpen} className="text-2xl" /></div>}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold text-ink truncate">{item.title}</p>
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