import { useState } from "react";
import { useAuth } from "./useAuth";
import { useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faFeatherPointed, faCamera } from '@fortawesome/free-solid-svg-icons';
import { apiPost } from "./api";
import { getAccessToken } from "./token";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function uploadAvatarFile(file) {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/upload/single?folder=writer-avatars`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url;
}

function BecomeWriter() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [penName, setPenName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    setError("");
    if (!penName.trim()) {
      setError("Pick a pen name readers will see on your stories.");
      return;
    }
    setSaving(true);
    try {
      let avatarUrl;
      if (avatarFile) {
        setUploading(true);
        avatarUrl = await uploadAvatarFile(avatarFile);
        setUploading(false);
      }

      await apiPost("/auth/become-writer", {
        penName: penName.trim(),
        bio: bio.trim() || undefined,
        avatarUrl,
      });
      await refreshUser();
      navigate("/writer/dashboard");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-500 rounded-full opacity-[0.06] blur-[100px]" />
      </div>

      <header className="fixed top-0 left-0 w-full z-40 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
          <Link to="/novels" className="text-white/40 hover:text-violet-400 transition">
            <FontAwesomeIcon icon={faChevronDown} className="rotate-90" />
          </Link>
          <h1 className="text-lg font-black tracking-tight">
            TEST<span className="text-violet-400">YOURSELF</span>
          </h1>
        </div>
      </header>

      <main className="relative z-10 pt-24 px-4 pb-10 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto bg-violet-500/15 border border-violet-500/30 rounded-2xl flex items-center justify-center text-violet-400 text-xl mb-4">
            <FontAwesomeIcon icon={faFeatherPointed} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Become a Writer</h2>
          <p className="text-white/40 text-sm">
            Publish serialized stories, release episodes, and build an audience of readers.
          </p>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">
          {error && <p className="text-pink-400 text-sm mb-4">{error}</p>}

          <div className="mb-4">
            <label className="text-xs text-white/30 mb-1 block">Pen name</label>
            <input
              type="text"
              placeholder="How readers will see your name"
              value={penName}
              onChange={e => setPenName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 transition"
            />
          </div>

          <div className="mb-4">
            <label className="text-xs text-white/30 mb-1 block">Writer profile picture (optional)</label>
            <p className="text-xs text-white/20 mb-3">
              This is separate from your main account photo — readers will only ever see this one.
            </p>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center overflow-hidden shrink-0">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <FontAwesomeIcon icon={faCamera} className="text-violet-400 opacity-40" />
                )}
              </div>
              <label className="px-4 py-2 bg-white/5 border border-white/10 hover:border-violet-500/40 text-white/70 hover:text-violet-400 rounded-xl text-sm cursor-pointer transition">
                {avatarFile ? "Change photo" : "Choose photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="mb-6">
            <label className="text-xs text-white/30 mb-1 block">Bio (optional)</label>
            <textarea
              placeholder="Tell readers a little about yourself…"
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 resize-none transition"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition"
          >
            {uploading ? "Uploading photo…" : saving ? "Setting up…" : "Start Writing"}
          </button>
        </div>
      </main>
    </div>
  );
}

export default BecomeWriter;