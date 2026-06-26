import { getAccessToken } from "./token";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStore, faUser, faComment, faPhone, faChevronRight, faCheckCircle
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

function MarketplaceOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ bio: "", chatSnapUsername: "", whatsapp: "" });
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleRoleSelect = async (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === "buyer") {
      setSubmitting(true);
      try { await apiFetch("/marketplace/buyer/onboard", { method: "POST" }); setStep(3); }
      catch (err) { console.error(err); }
      setSubmitting(false);
    } else { setStep(2); }
  };

  const handleSellerSubmit = async () => {
    setSubmitting(true);
    try { await apiFetch("/marketplace/seller/onboard", { method: "POST", body: JSON.stringify(form) }); setStep(3); }
    catch (err) { console.error(err); }
    setSubmitting(false);
  };

  const inputCls = "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/40 transition";

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-4">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-500 rounded-full opacity-[0.06] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* Step 1 — Choose Role */}
        {step === 1 && (
          <div className="bg-[#0d0d14] border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-violet-500/15 border border-violet-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faStore} className="text-violet-400 text-2xl" />
              </div>
              <h1 className="text-2xl font-bold text-white">Welcome to the Marketplace</h1>
              <p className="text-white/40 text-sm mt-2">How would you like to use the marketplace?</p>
            </div>
            <div className="space-y-3">
              {[
                { role: "seller", icon: faStore, label: "I want to Sell", sub: "List items and connect with buyers", color: "violet" },
                { role: "buyer", icon: faUser, label: "I want to Buy", sub: "Browse and purchase from sellers", color: "emerald" },
              ].map(({ role: r, icon, label, sub }) => (
                <button key={r} onClick={() => handleRoleSelect(r)} disabled={submitting}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-white/10 hover:border-violet-500/30 hover:bg-violet-500/5 transition group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-500/10 rounded-full flex items-center justify-center text-violet-400">
                      <FontAwesomeIcon icon={icon} />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-white">{label}</p>
                      <p className="text-xs text-white/30">{sub}</p>
                    </div>
                  </div>
                  <FontAwesomeIcon icon={faChevronRight} className="text-white/20 group-hover:text-violet-400 transition" />
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-white/20 mt-6">You can change this later in your profile</p>
          </div>
        )}

        {/* Step 2 — Seller Form */}
        {step === 2 && (
          <div className="bg-[#0d0d14] border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-violet-500/15 border border-violet-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faStore} className="text-violet-400 text-2xl" />
              </div>
              <h1 className="text-xl font-bold text-white">Set Up Your Seller Profile</h1>
              <p className="text-white/40 text-sm mt-1">Help buyers know how to reach you</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/30 mb-1 block flex items-center gap-1"><FontAwesomeIcon icon={faUser} /> Bio (optional)</label>
                <textarea value={form.bio} onChange={e => set("bio", e.target.value)} placeholder="Tell buyers a bit about yourself..." rows={3} className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="text-xs text-white/30 mb-1 block flex items-center gap-1"><FontAwesomeIcon icon={faComment} /> ChatSnap Username *</label>
                <input value={form.chatSnapUsername} onChange={e => set("chatSnapUsername", e.target.value)} placeholder="@yourusername" className={inputCls} />
                <p className="text-xs text-white/20 mt-1">Buyers will contact you via ChatSnap DM</p>
              </div>
              <div>
                <label className="text-xs text-white/30 mb-1 block flex items-center gap-1"><FontAwesomeIcon icon={faPhone} /> WhatsApp Number (optional)</label>
                <input value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="e.g. 2348012345678" className={inputCls} />
              </div>
            </div>
            <button onClick={handleSellerSubmit} disabled={submitting || !form.chatSnapUsername} className="w-full mt-6 py-3 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white rounded-2xl font-semibold transition">
              {submitting ? "Saving..." : "Complete Setup"}
            </button>
            <button onClick={() => setStep(1)} className="w-full mt-2 py-2 text-white/30 text-sm hover:text-white/50 transition">Go Back</button>
          </div>
        )}

        {/* Step 3 — Done */}
        {step === 3 && (
          <div className="bg-[#0d0d14] border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-400 text-3xl" />
            </div>
            <h1 className="text-2xl font-bold text-white">You're all set!</h1>
            <p className="text-white/40 text-sm mt-2">
              {role === "seller" ? "Your seller profile is ready. Start listing your items!" : "Your buyer account is ready. Start browsing the marketplace!"}
            </p>
            <button onClick={() => navigate(role === "seller" ? "/marketplace/create" : "/marketplace")} className="mt-6 w-full py-3 bg-violet-500 hover:bg-violet-400 text-white rounded-2xl font-semibold transition">
              {role === "seller" ? "Create First Listing" : "Browse Marketplace"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MarketplaceOnboarding;

