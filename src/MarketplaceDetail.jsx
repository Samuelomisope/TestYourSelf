import { getAccessToken } from "./token";
// MarketplaceDetail.jsx - dark theme
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth } from "./firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar, faUniversity, faTag, faBoxOpen,
  faChevronLeft, faChevronRight, faCommentDots,
  faStore, faPaperPlane
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

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(star => (
        <button key={star} onClick={() => onChange && onChange(star)} type="button">
          <FontAwesomeIcon icon={faStar} className={`text-xl ${star <= value ? "text-yellow-400" : "text-white/10"} transition`} />
        </button>
      ))}
    </div>
  );
}

function MarketplaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIndex, setImgIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch(`/marketplace/${id}`).then(setItem).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const submitReview = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      const review = await apiFetch(`/marketplace/${id}/reviews`, { method: "POST", body: JSON.stringify({ rating, comment }) });
      setItem(prev => ({ ...prev, reviews: [{ ...review, user: { displayName: "You" } }, ...prev.reviews] }));
      setRating(0); setComment("");
    } catch (err) { console.error(err); }
    setSubmitting(false);
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-violet-400">Loading...</div>;
  if (!item) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/40">Item not found.</div>;

  const avgRating = item.reviews?.length ? (item.reviews.reduce((s, r) => s + r.rating, 0) / item.reviews.length).toFixed(1) : null;
  const seller = item.user;
  const chatSnapUsername = seller?.sellerProfile?.chatSnapUsername;
  const whatsapp = seller?.sellerProfile?.whatsapp;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
      </div>

      <header className="bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/marketplace")} className="text-white/40 hover:text-violet-400 transition">
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <h1 className="text-base font-bold text-white truncate">{item.title}</h1>
        </div>
      </header>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Images */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
          <div className="relative h-64 bg-black">
            {item.images?.length > 0 ? (
              <>
                <img src={item.images[imgIndex]} alt={item.title} className="w-full h-full object-cover" />
                {item.images.length > 1 && (
                  <>
                    <button onClick={() => setImgIndex(i => Math.max(0, i - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition"><FontAwesomeIcon icon={faChevronLeft} className="text-sm" /></button>
                    <button onClick={() => setImgIndex(i => Math.min(item.images.length - 1, i + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition"><FontAwesomeIcon icon={faChevronRight} className="text-sm" /></button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {item.images.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === imgIndex ? "bg-violet-400" : "bg-white/30"}`} />)}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/10"><FontAwesomeIcon icon={faBoxOpen} className="text-5xl" /></div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">{item.title}</h2>
              <p className="text-2xl font-bold text-violet-400 mt-1">₦{item.price?.toLocaleString()}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.type === "DIGITAL" ? "bg-violet-500/15 text-violet-400" : item.type === "SERVICE" ? "bg-blue-500/15 text-blue-400" : "bg-white/5 text-white/40"}`}>{item.type}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">{item.condition}</span>
            </div>
          </div>
          <p className="text-white/50 text-sm mt-3 leading-relaxed">{item.description}</p>
          {item.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {item.tags.map(tag => <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-white/5 text-white/40 rounded-full text-xs"><FontAwesomeIcon icon={faTag} /> {tag}</span>)}
            </div>
          )}
          <div className="flex items-center gap-4 mt-4 text-xs text-white/30">
            <span className="flex items-center gap-1"><FontAwesomeIcon icon={faUniversity} />{item.university?.shortName || "—"}</span>
            {avgRating && <span className="flex items-center gap-1 text-yellow-400"><FontAwesomeIcon icon={faStar} /> {avgRating} ({item.reviews.length} reviews)</span>}
          </div>
        </div>

        {/* Seller */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <p className="text-sm font-semibold text-white/50 mb-3 flex items-center gap-2"><FontAwesomeIcon icon={faStore} className="text-violet-400" /> Seller</p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/marketplace/seller/${seller.id}`)}>
              <img src={seller.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${seller.displayName}`} className="w-10 h-10 rounded-full object-cover border border-white/10" alt="" />
              <div>
                <p className="font-medium text-white text-sm">{seller.displayName}</p>
                {seller.sellerProfile?.rating > 0 && <span className="flex items-center gap-1 text-xs text-yellow-400"><FontAwesomeIcon icon={faStar} />{seller.sellerProfile.rating.toFixed(1)}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              {chatSnapUsername && <button onClick={() => navigate(`/chat?dm=${seller.id}`)} className="flex items-center gap-1.5 px-3 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-xl text-xs font-medium transition"><FontAwesomeIcon icon={faCommentDots} /> Chat</button>}
              {whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-medium hover:bg-emerald-500/30 transition">WhatsApp</a>}
              {!chatSnapUsername && !whatsapp && <span className="text-xs text-white/20">No contact info</span>}
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <p className="text-sm font-semibold text-white/50 mb-4 flex items-center gap-2"><FontAwesomeIcon icon={faStar} className="text-yellow-400" /> Reviews ({item.reviews?.length || 0})</p>
          <div className="mb-5 pb-5 border-b border-white/5">
            <p className="text-xs text-white/30 mb-2">Leave a review</p>
            <StarRating value={rating} onChange={setRating} />
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment (optional)..." rows={2}
              className="w-full mt-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/40 resize-none transition" />
            <button onClick={submitReview} disabled={!rating || submitting} className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-xl text-xs font-medium transition disabled:opacity-40">
              <FontAwesomeIcon icon={faPaperPlane} /> Submit Review
            </button>
          </div>
          {item.reviews?.length === 0 ? (
            <p className="text-white/20 text-sm text-center py-4">No reviews yet. Be the first!</p>
          ) : (
            <div className="space-y-3">
              {item.reviews.map((r, i) => (
                <div key={i} className="flex gap-3">
                  <img src={r.user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${r.user?.displayName}`} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" alt="" />
                  <div>
                    <div className="flex items-center gap-2"><p className="text-sm font-medium text-white">{r.user?.displayName}</p><StarRating value={r.rating} /></div>
                    {r.comment && <p className="text-xs text-white/40 mt-0.5">{r.comment}</p>}
                    <p className="text-xs text-white/20 mt-0.5">{new Date(r.createdAt).toLocaleDateString()}</p>
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

export default MarketplaceDetail;

