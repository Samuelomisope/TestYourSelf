
// ── CreateListing.jsx (dark theme) ────────────────────────────────
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { getIdToken } from "firebase/auth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faPlus, faImage, faTag, faTimes, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { uploadMultiple } from "./useUpload";
import { API } from "./config";
import { createNotification } from "./notifications";
import { useAuth } from "./useAuth";

async function apiFetch(path, options = {}) {
  const token = await getIdToken(auth.currentUser, true);
  const res = await fetch(`${API}${path}`, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const CATEGORIES = ["Books","Electronics","Clothing","Furniture","Food","Services","Digital","Other"];
const CONDITIONS = ["NEW","GOOD","FAIR","POOR"];
const TYPES = ["PHYSICAL","DIGITAL","SERVICE"];

function CreateListing() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [form, setForm] = useState({ title:"", description:"", price:"", images:[], category:"", type:"PHYSICAL", condition:"GOOD", tags:[] });
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const { user } = useAuth();
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try { const urls = await uploadMultiple(files, "marketplace"); set("images", [...form.images, ...urls]); }
    catch (err) { console.error(err); alert("Image upload failed."); }
    setUploading(false);
  };

 const submit = async () => {
  if (!form.title || !form.description || !form.price) return;
  setSubmitting(true);
  try {
    await apiFetch("/marketplace", { method: "POST", body: JSON.stringify({ ...form, price: parseFloat(form.price) }) });
    await createNotification(user.uid, {
      type: "marketplace",
      message: `Your listing "${form.title}" is now live on the marketplace.`,
    });
    navigate("/marketplace/my-listings");
  } catch (err) { console.error(err); alert("Failed to create listing. Make sure you belong to a university."); }
  setSubmitting(false);
};

  const inputCls = "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/40 transition";
  const selectCls = "w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none focus:border-violet-500/40 transition";

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none"><div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" /></div>

      <header className="bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/marketplace")} className="text-white/40 hover:text-violet-400 transition"><FontAwesomeIcon icon={faChevronLeft} /></button>
          <h1 className="text-base font-bold text-white">Create Listing</h1>
        </div>
      </header>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Images */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <p className="text-sm font-semibold text-white/50 mb-3 flex items-center gap-2"><FontAwesomeIcon icon={faImage} className="text-violet-400" /> Images</p>
          <div className="flex flex-wrap gap-3">
            {form.images.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => set("images", form.images.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-500/80 transition"><FontAwesomeIcon icon={faTimes} /></button>
              </div>
            ))}
            <label className={`w-20 h-20 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-white/30 hover:border-violet-500/40 hover:text-violet-400 transition cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              <FontAwesomeIcon icon={uploading ? faSpinner : faPlus} spin={uploading} />
              <span className="text-xs mt-1">{uploading ? "Uploading..." : "Add"}</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold text-white/50">Basic Info</p>
          <div><label className="text-xs text-white/30 mb-1 block">Title *</label><input value={form.title} onChange={e => set("title", e.target.value)} placeholder="What are you selling?" className={inputCls} /></div>
          <div><label className="text-xs text-white/30 mb-1 block">Description *</label><textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe your item..." rows={4} className={`${inputCls} resize-none`} /></div>
          <div><label className="text-xs text-white/30 mb-1 block">Price (₦) *</label><input type="number" value={form.price} onChange={e => set("price", e.target.value)} placeholder="0" className={inputCls} /></div>
        </div>

        {/* Details */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold text-white/50">Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/30 mb-1 block">Type</label><select value={form.type} onChange={e => set("type", e.target.value)} className={selectCls}>{TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="text-xs text-white/30 mb-1 block">Condition</label><select value={form.condition} onChange={e => set("condition", e.target.value)} className={selectCls}>{CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div><label className="text-xs text-white/30 mb-1 block">Category</label><select value={form.category} onChange={e => set("category", e.target.value)} className={selectCls}><option value="">Select category</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>

        {/* Tags */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <p className="text-sm font-semibold text-white/50 mb-3 flex items-center gap-2"><FontAwesomeIcon icon={faTag} className="text-violet-400" /> Tags</p>
          <div className="flex gap-2 mb-3">
            <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && tagInput.trim() && !form.tags.includes(tagInput.trim())) { set("tags", [...form.tags, tagInput.trim()]); setTagInput(""); }}} placeholder="Add a tag..." className={inputCls} />
            <button onClick={() => { if (tagInput.trim() && !form.tags.includes(tagInput.trim())) { set("tags", [...form.tags, tagInput.trim()]); setTagInput(""); }}} className="px-3 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-xl text-sm transition"><FontAwesomeIcon icon={faPlus} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-violet-500/15 text-violet-400 border border-violet-500/20 rounded-full text-xs">
                {tag}<button onClick={() => set("tags", form.tags.filter(t => t !== tag))}><FontAwesomeIcon icon={faTimes} className="text-violet-400/60 hover:text-pink-400 transition" /></button>
              </span>
            ))}
          </div>
        </div>

        <button onClick={submit} disabled={submitting || !form.title || !form.description || !form.price} className="w-full py-3 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white rounded-2xl font-semibold transition">
          {submitting ? "Creating..." : "Create Listing"}
        </button>
      </div>
    </div>
  );
}

export default CreateListing;