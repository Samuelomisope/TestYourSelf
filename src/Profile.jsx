import { useEffect, useState, useRef } from "react";
import { useAuth } from "./useAuth";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "./firebase";
import { updateProfile } from "firebase/auth";
import { apiGet, apiPatch } from "./api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft, faPen, faTimes, faCamera,
  faBookOpen, faShoppingBag, faFire, faFile, faMessage,
  faUserGraduate, faBuildingColumns, faFloppyDisk,
  faDownload, faLock, faGlobe, faSpinner, faTriangleExclamation,
  faChartBar, faMedal, faLayerGroup, faSearch,
  faEnvelope, faCalendarDays, faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef();

  const [pgUser, setPgUser]       = useState(null);
  const [stats, setStats]         = useState(null);
  const [materials, setMaterials] = useState([]);
  const [universities, setUnis]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveOk, setSaveOk]       = useState(false);
  const [activeTab, setActiveTab] = useState("materials");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [uniSearch, setUniSearch] = useState("");
  const [uniOpen, setUniOpen]     = useState(false);
  const [error, setError]         = useState("");
  const [form, setForm] = useState({ displayName: "", bio: "", faculty: "", department: "", universityId: "" });

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [u, s, m, unis] = await Promise.all([apiGet("/users/me"), apiGet("/users/me/stats"), apiGet("/study-material/my"), apiGet("/universities")]);
        setPgUser(u); setStats(s); setMaterials(Array.isArray(m) ? m : []); setUnis(Array.isArray(unis) ? unis : []);
        setUniSearch(u.university?.name || "");
        setForm({ displayName: u.displayName || "", bio: u.bio || "", faculty: u.faculty || "", department: u.department || "", universityId: u.universityId || "" });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const handlePhotoChange = (e) => {
    const f = e.target.files[0];
    if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); }
  };

  const handleSave = async () => {
    setError(""); setSaving(true);
    try {
      let photoURL = pgUser?.photoURL;
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        fd.append("upload_preset", "testyourself_upload");
        fd.append("folder", "testyourself/avatars");
        const r = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
        photoURL = (await r.json()).secure_url;
        await updateProfile(auth.currentUser, { displayName: form.displayName, photoURL });
      } else {
        await updateProfile(auth.currentUser, { displayName: form.displayName });
      }
      const updated = await apiPatch("/users/me", { displayName: form.displayName, bio: form.bio, faculty: form.faculty, department: form.department, universityId: form.universityId || undefined, photoURL });
      setPgUser(updated); setUniSearch(updated.university?.name || "");
      setEditing(false); setPhotoFile(null); setPhotoPreview(null);
      setSaveOk(true); setTimeout(() => setSaveOk(false), 3000);
    } catch (e) { console.error(e); setError("Failed to save. Please try again."); }
    finally { setSaving(false); }
  };

  const cancelEdit = () => {
    setEditing(false); setPhotoPreview(null); setPhotoFile(null); setError("");
    setUniSearch(pgUser?.university?.name || "");
    setForm({ displayName: pgUser?.displayName || "", bio: pgUser?.bio || "", faculty: pgUser?.faculty || "", department: pgUser?.department || "", universityId: pgUser?.universityId || "" });
  };

  const fmt = (ts) => ts ? new Date(ts).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";

  const fileIcon = (mime) => {
    if (!mime) return faFile;
    if (mime.includes("video")) return faLayerGroup;
    return faBookOpen;
  };

  const filteredUnis = universities.filter(u =>
    u.name.toLowerCase().includes(uniSearch.toLowerCase()) ||
    (u.shortName && u.shortName.toLowerCase().includes(uniSearch.toLowerCase()))
  ).slice(0, 7);

  const avatar = photoPreview || pgUser?.photoURL ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(pgUser?.displayName || user?.email || "?")}`;

  const inputCls = "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/40 transition";

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-violet-400">
        <FontAwesomeIcon icon={faSpinner} className="text-3xl animate-spin" />
        <span className="text-xs text-white/30">Loading your profile…</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-pink-500 rounded-full opacity-[0.06] blur-[100px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-5 py-3.5">
        <button onClick={() => navigate("/home")} className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/40 hover:text-violet-400 hover:border-violet-500/40 transition text-sm">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <span className="font-black tracking-tight text-white">My <span className="text-violet-400">Profile</span></span>
        {!editing
          ? <button onClick={() => setEditing(true)} className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/40 hover:text-violet-400 hover:border-violet-500/40 transition text-sm"><FontAwesomeIcon icon={faPen} /></button>
          : <button onClick={cancelEdit} className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/40 hover:text-pink-400 transition text-sm"><FontAwesomeIcon icon={faTimes} /></button>
        }
      </header>

      <main className="relative z-10 pt-20 px-4 pb-10 max-w-xl mx-auto space-y-4">

        {/* Profile Card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 mt-4">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-5">
            <div className="relative mb-3">
              <img src={avatar} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-violet-500/40 shadow-lg shadow-violet-500/10" />
              {editing && (
                <button onClick={() => fileRef.current.click()} className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-violet-500 hover:bg-violet-400 border-2 border-[#0a0a0f] flex items-center justify-center text-white text-xs transition">
                  <FontAwesomeIcon icon={faCamera} />
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>

            {editing ? (
              <input className={`${inputCls} text-center font-bold text-lg max-w-xs`} value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="Your name" />
            ) : (
              <h2 className="text-xl font-bold text-white">{pgUser?.displayName || "—"}</h2>
            )}

            <div className="flex items-center gap-2 mt-2 text-white/30 text-sm">
              <FontAwesomeIcon icon={faEnvelope} className="text-xs" />
              {user?.email}
            </div>

            {!editing && pgUser?.university && (
              <span className="mt-2 inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-full px-3 py-1 text-xs font-medium">
                <FontAwesomeIcon icon={faBuildingColumns} className="text-xs" />
                {pgUser.university.shortName || pgUser.university.name}
              </span>
            )}

            <div className="flex items-center gap-2 mt-2 text-white/20 text-xs">
              <FontAwesomeIcon icon={faCalendarDays} className="text-xs" />
              Joined {fmt(pgUser?.createdAt)}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl px-4 py-3 text-sm text-pink-400 flex items-center gap-2 mb-4">
              <FontAwesomeIcon icon={faTriangleExclamation} />
              {error}
            </div>
          )}

          {/* Edit fields */}
          {editing && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-white/30 uppercase tracking-wider mb-1.5">Bio</label>
                <textarea className={`${inputCls} resize-none`} placeholder="Write something about yourself…" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} />
              </div>

              {/* University search */}
              <div className="relative">
                <label className="block text-xs font-semibold text-white/30 uppercase tracking-wider mb-1.5">
                  <FontAwesomeIcon icon={faBuildingColumns} className="mr-1" /> University
                </label>
                <div className="relative">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-xs pointer-events-none" />
                  <input className={`${inputCls} pl-8`} placeholder="Search your university…" value={uniSearch} onChange={e => { setUniSearch(e.target.value); setUniOpen(true); }} onFocus={() => setUniOpen(true)} />
                </div>
                {uniOpen && uniSearch.length > 0 && filteredUnis.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-[#0d0d14] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                    {filteredUnis.map(u => (
                      <button key={u.id} onClick={() => { setForm(f => ({ ...f, universityId: u.id })); setUniSearch(u.name); setUniOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-violet-500/10 hover:text-violet-400 transition ${form.universityId === u.id ? "bg-violet-500/10 text-violet-400" : "text-white/60"}`}>
                        <FontAwesomeIcon icon={faBuildingColumns} className="text-violet-400/60 text-xs shrink-0" />
                        <span>{u.name}{u.shortName ? ` (${u.shortName})` : ""}</span>
                        {form.universityId === u.id && <FontAwesomeIcon icon={faCircleCheck} className="ml-auto text-violet-400 text-xs" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Faculty + Department */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/30 uppercase tracking-wider mb-1.5"><FontAwesomeIcon icon={faUserGraduate} className="mr-1" />Faculty</label>
                  <input className={inputCls} placeholder="e.g. Engineering" value={form.faculty} onChange={e => setForm(f => ({ ...f, faculty: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/30 uppercase tracking-wider mb-1.5">Department</label>
                  <input className={inputCls} placeholder="e.g. Computer Sci." value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
                </div>
              </div>

              <div className="border-t border-white/5 pt-3" />

              <button onClick={handleSave} disabled={saving} className="w-full py-3 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white text-sm font-semibold flex items-center justify-center gap-2 transition">
                {saving ? <><FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Saving…</> : <><FontAwesomeIcon icon={faFloppyDisk} /> Save Changes</>}
              </button>
            </div>
          )}

          {/* View mode bio + badges */}
          {!editing && (
            <>
              {pgUser?.bio && <p className="text-sm text-white/40 leading-relaxed text-center mb-3">{pgUser.bio}</p>}
              {(pgUser?.faculty || pgUser?.department) && (
                <div className="flex justify-center gap-2 flex-wrap">
                  {pgUser.faculty && <span className="inline-flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full px-3 py-1 text-xs"><FontAwesomeIcon icon={faUserGraduate} className="text-xs" />{pgUser.faculty}</span>}
                  {pgUser.department && <span className="inline-flex items-center gap-1.5 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-full px-3 py-1 text-xs">{pgUser.department}</span>}
                </div>
              )}
            </>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Files",    value: stats?.files    || 0, icon: faFile,       color: "text-violet-400" },
            { label: "Streak",   value: pgUser?.streakCount || 0, icon: faFire,   color: "text-yellow-400" },
            { label: "Products", value: stats?.products || 0, icon: faShoppingBag, color: "text-pink-400" },
            { label: "Messages", value: stats?.messages || 0, icon: faMessage,    color: "text-emerald-400" },
          ].map((s, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-center">
              <div className={`text-lg mb-1 ${s.color}`}><FontAwesomeIcon icon={s.icon} /></div>
              <div className="text-lg font-bold text-white">{s.value}</div>
              <div className="text-xs text-white/30">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Leaderboard score */}
        {stats?.leaderboardScore > 0 && (
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-yellow-500/15 border border-yellow-500/20 flex items-center justify-center text-yellow-400 text-lg">
              <FontAwesomeIcon icon={faMedal} />
            </div>
            <div>
              <div className="font-bold text-white text-base">{stats.leaderboardScore.toLocaleString()} pts</div>
              <div className="text-xs text-white/30">Leaderboard score</div>
            </div>
            <FontAwesomeIcon icon={faChartBar} className="ml-auto text-white/20 text-sm" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: "materials", label: "Study Materials", icon: faBookOpen },
            { id: "listings",  label: "Listings",        icon: faShoppingBag },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border transition ${activeTab === tab.id ? "bg-violet-500 text-white border-violet-500" : "bg-white/[0.03] border-white/10 text-white/40 hover:border-violet-500/30 hover:text-violet-400"}`}>
              <FontAwesomeIcon icon={tab.icon} />{tab.label}
            </button>
          ))}
        </div>

        {/* Materials */}
        {activeTab === "materials" && (
          <div className="space-y-3">
            {materials.length === 0 ? (
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl py-10 text-center">
                <div className="w-14 h-14 bg-violet-500/10 rounded-2xl flex items-center justify-center text-violet-400 text-2xl mx-auto mb-3"><FontAwesomeIcon icon={faBookOpen} /></div>
                <p className="font-bold text-white text-sm mb-1">No materials yet</p>
                <p className="text-xs text-white/30 mb-4">Upload study materials to share with your campus</p>
                <Link to="/study-material" className="inline-flex items-center gap-2 px-5 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-sm font-semibold transition">
                  <FontAwesomeIcon icon={faFile} /> Upload a File
                </Link>
              </div>
            ) : (
              materials.map((m, i) => (
                <div key={m.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center gap-3 hover:border-violet-500/20 transition" style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="w-11 h-11 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center text-base shrink-0">
                    <FontAwesomeIcon icon={fileIcon(m.fileType)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{m.title}</p>
                    <p className="text-xs text-white/30 mt-0.5">{m.faculty || "—"} · {new Date(m.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.isPublic ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-white/30"}`}>
                      <FontAwesomeIcon icon={m.isPublic ? faGlobe : faLock} className="text-[9px]" />
                      {m.isPublic ? "Public" : "Private"}
                    </span>
                    <span className="text-xs text-white/20 flex items-center gap-1">
                      <FontAwesomeIcon icon={faDownload} className="text-[9px]" />
                      {m.downloadCount || 0}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Listings */}
        {activeTab === "listings" && (
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl py-10 text-center">
            <div className="w-14 h-14 bg-violet-500/10 rounded-2xl flex items-center justify-center text-violet-400 text-2xl mx-auto mb-3"><FontAwesomeIcon icon={faShoppingBag} /></div>
            <p className="font-bold text-white text-sm mb-1">No listings yet</p>
            <p className="text-xs text-white/30 mb-4">List items on the marketplace to sell to fellow students</p>
            <Link to="/marketplace" className="inline-flex items-center gap-2 px-5 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-sm font-semibold transition">
              <FontAwesomeIcon icon={faShoppingBag} /> Go to Marketplace
            </Link>
          </div>
        )}
      </main>

      {/* Toast */}
      {saveOk && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0d0d14] border border-white/10 text-white px-5 py-3 rounded-full text-sm font-medium flex items-center gap-2 z-50 shadow-xl animate-bounce-in whitespace-nowrap">
          <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-400" />
          Profile saved successfully
        </div>
      )}
    </div>
  );
}