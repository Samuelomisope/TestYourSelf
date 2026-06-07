import { useState, useEffect, useRef } from "react";
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

/* ─── tiny motion helper ─────────────────────────────── */
const cls = (...c) => c.filter(Boolean).join(" ");

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef();

  const [pgUser, setPgUser]         = useState(null);
  const [stats, setStats]           = useState(null);
  const [materials, setMaterials]   = useState([]);
  const [universities, setUnis]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [editing, setEditing]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saveOk, setSaveOk]         = useState(false);
  const [activeTab, setActiveTab]   = useState("materials");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile]   = useState(null);
  const [uniSearch, setUniSearch]   = useState("");
  const [uniOpen, setUniOpen]       = useState(false);
  const [error, setError]           = useState("");

  const [form, setForm] = useState({
    displayName: "", bio: "", faculty: "", department: "", universityId: "",
  });

  /* ── fetch ────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [u, s, m, unis] = await Promise.all([
          apiGet("/users/me"),
          apiGet("/users/me/stats"),
          apiGet("/study-material/my"),
          apiGet("/universities"),
        ]);
        setPgUser(u);
        setStats(s);
        setMaterials(Array.isArray(m) ? m : []);
        setUnis(Array.isArray(unis) ? unis : []);
        setUniSearch(u.university?.name || "");
        setForm({
          displayName: u.displayName || "",
          bio: u.bio || "",
          faculty: u.faculty || "",
          department: u.department || "",
          universityId: u.universityId || "",
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  /* ── photo ────────────────────────────────────────── */
  const handlePhotoChange = (e) => {
    const f = e.target.files[0];
    if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); }
  };

  /* ── save ─────────────────────────────────────────── */
  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      let photoURL = pgUser?.photoURL;
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        fd.append("upload_preset", "testyourself_upload");
        fd.append("folder", "testyourself/avatars");
        const r = await fetch(
          `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: "POST", body: fd }
        );
        const d = await r.json();
        photoURL = d.secure_url;
        await updateProfile(auth.currentUser, { displayName: form.displayName, photoURL });
      } else {
        await updateProfile(auth.currentUser, { displayName: form.displayName });
      }
      const updated = await apiPatch("/users/me", {
        displayName: form.displayName,
        bio: form.bio,
        faculty: form.faculty,
        department: form.department,
        universityId: form.universityId || undefined,
        photoURL,
      });
      setPgUser(updated);
      setUniSearch(updated.university?.name || "");
      setEditing(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (e) {
      console.error(e);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setPhotoPreview(null);
    setPhotoFile(null);
    setError("");
    setUniSearch(pgUser?.university?.name || "");
    setForm({
      displayName: pgUser?.displayName || "",
      bio: pgUser?.bio || "",
      faculty: pgUser?.faculty || "",
      department: pgUser?.department || "",
      universityId: pgUser?.universityId || "",
    });
  };

  /* ── helpers ──────────────────────────────────────── */
  const fmt = (ts) => ts
    ? new Date(ts).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  const fileIcon = (mime) => {
    if (!mime) return faFile;
    if (mime.includes("pdf")) return faFile;
    if (mime.includes("video")) return faLayerGroup;
    return faBookOpen;
  };

  const filteredUnis = universities.filter(u =>
    u.name.toLowerCase().includes(uniSearch.toLowerCase()) ||
    (u.shortName && u.shortName.toLowerCase().includes(uniSearch.toLowerCase()))
  ).slice(0, 7);

  /* ── loading ──────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div style={{ color: "var(--accent)" }} className="flex flex-col items-center gap-3">
        <FontAwesomeIcon icon={faSpinner} className="text-3xl animate-spin" />
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)" }}>
          Loading your profile…
        </span>
      </div>
    </div>
  );

  const avatar = photoPreview || pgUser?.photoURL ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(pgUser?.displayName || user?.email || "?")}`;

  /* ── render ───────────────────────────────────────── */
  return (
    <>
      {/* ── CSS Variables + global styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@600;700;800&display=swap');

        :root {
          --bg: #f4f3f0;
          --surface: #ffffff;
          --surface2: #f9f8f6;
          --border: #e8e5e0;
          --accent: #4f46e5;
          --accent2: #7c3aed;
          --accent-soft: #eef2ff;
          --accent-text: #4338ca;
          --danger: #ef4444;
          --success: #22c55e;
          --warning: #f59e0b;
          --text: #1c1917;
          --text2: #57534e;
          --muted: #a8a29e;
          --font-head: 'Syne', sans-serif;
          --font-body: 'DM Sans', sans-serif;
          --radius: 16px;
          --shadow: 0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04);
          --shadow-lg: 0 8px 32px rgba(0,0,0,.1);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .profile-root {
          min-height: 100vh;
          background: var(--bg);
          font-family: var(--font-body);
          color: var(--text);
        }

        /* header */
        .pf-header {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          background: rgba(255,255,255,.85);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px;
        }
        .pf-header-title {
          font-family: var(--font-head);
          font-size: 17px; font-weight: 700;
          color: var(--text);
          letter-spacing: -.3px;
        }
        .pf-icon-btn {
          width: 36px; height: 36px;
          border-radius: 10px;
          border: 1.5px solid var(--border);
          background: var(--surface);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all .18s;
          color: var(--text2); font-size: 13px;
        }
        .pf-icon-btn:hover { border-color: var(--accent); color: var(--accent); }
        .pf-icon-btn.accent { background: var(--accent); color: #fff; border-color: var(--accent); }
        .pf-icon-btn.accent:hover { background: var(--accent2); border-color: var(--accent2); }

        /* main */
        .pf-main { padding: 80px 16px 32px; max-width: 600px; margin: 0 auto; }

        /* card */
        .pf-card {
          background: var(--surface);
          border-radius: var(--radius);
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          padding: 24px;
          margin-bottom: 14px;
          animation: fadeUp .35s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* avatar area */
        .pf-avatar-wrap { position: relative; display: inline-block; }
        .pf-avatar {
          width: 88px; height: 88px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid var(--surface);
          box-shadow: 0 0 0 2px var(--accent), var(--shadow);
          transition: box-shadow .2s;
        }
        .pf-avatar-btn {
          position: absolute; bottom: 0; right: 0;
          width: 28px; height: 28px;
          border-radius: 50%;
          background: var(--accent); color: #fff;
          border: 2px solid var(--surface);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 11px;
          transition: background .18s;
        }
        .pf-avatar-btn:hover { background: var(--accent2); }

        /* inputs */
        .pf-input {
          width: 100%;
          border: 1.5px solid var(--border);
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 14px;
          font-family: var(--font-body);
          color: var(--text);
          background: var(--surface2);
          outline: none;
          transition: border-color .18s, background .18s;
        }
        .pf-input:focus { border-color: var(--accent); background: var(--surface); }
        .pf-input::placeholder { color: var(--muted); }
        .pf-textarea { resize: none; min-height: 80px; line-height: 1.5; }
        .pf-label {
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: .6px;
          color: var(--muted); margin-bottom: 6px; display: block;
        }

        /* uni dropdown */
        .pf-uni-drop {
          border: 1.5px solid var(--border);
          border-radius: 12px;
          background: var(--surface);
          overflow: hidden;
          max-height: 200px;
          overflow-y: auto;
          margin-top: 4px;
          box-shadow: var(--shadow-lg);
          animation: fadeDown .15s ease;
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pf-uni-item {
          padding: 10px 14px;
          font-size: 13px;
          cursor: pointer;
          color: var(--text2);
          display: flex; align-items: center; gap: 10px;
          transition: background .12s;
        }
        .pf-uni-item:hover { background: var(--accent-soft); color: var(--accent-text); }
        .pf-uni-item.active { background: var(--accent-soft); color: var(--accent-text); font-weight: 600; }

        /* badge */
        .pf-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px; font-weight: 500;
        }
        .pf-badge-indigo { background: var(--accent-soft); color: var(--accent-text); }
        .pf-badge-purple { background: #f5f3ff; color: #6d28d9; }
        .pf-badge-pink   { background: #fdf2f8; color: #be185d; }
        .pf-badge-green  { background: #f0fdf4; color: #15803d; }
        .pf-badge-gray   { background: #f5f5f4; color: #78716c; }

        /* save button */
        .pf-save-btn {
          width: 100%;
          padding: 13px;
          border-radius: 12px;
          background: var(--accent);
          color: #fff;
          font-family: var(--font-body);
          font-size: 14px; font-weight: 600;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background .18s, transform .12s;
        }
        .pf-save-btn:hover:not(:disabled) { background: var(--accent2); }
        .pf-save-btn:active:not(:disabled) { transform: scale(.98); }
        .pf-save-btn:disabled { opacity: .6; cursor: not-allowed; }

        /* stats grid */
        .pf-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }
        .pf-stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px 8px;
          text-align: center;
          box-shadow: var(--shadow);
          animation: fadeUp .35s ease both;
        }
        .pf-stat-icon { font-size: 18px; margin-bottom: 6px; }
        .pf-stat-val {
          font-family: var(--font-head);
          font-size: 20px; font-weight: 700;
          color: var(--text);
        }
        .pf-stat-label { font-size: 11px; color: var(--muted); margin-top: 2px; }

        /* tabs */
        .pf-tabs {
          display: flex; gap: 8px; margin-bottom: 14px;
        }
        .pf-tab {
          flex: 1; padding: 10px;
          border-radius: 12px;
          font-size: 13px; font-weight: 600;
          border: 1.5px solid var(--border);
          background: var(--surface);
          color: var(--text2);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          transition: all .18s;
        }
        .pf-tab.active {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }
        .pf-tab:not(.active):hover { border-color: var(--accent); color: var(--accent); }

        /* material card */
        .pf-material-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px;
          display: flex; align-items: center; gap: 12px;
          box-shadow: var(--shadow);
          transition: box-shadow .18s, transform .18s;
          animation: fadeUp .3s ease both;
        }
        .pf-material-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-1px); }
        .pf-material-icon {
          width: 42px; height: 42px;
          border-radius: 12px;
          background: var(--accent-soft);
          color: var(--accent);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; flex-shrink: 0;
        }

        /* empty state */
        .pf-empty {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 40px 20px;
          text-align: center;
          animation: fadeUp .3s ease;
        }
        .pf-empty-icon {
          width: 56px; height: 56px;
          border-radius: 16px;
          background: var(--accent-soft);
          color: var(--accent);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
          margin: 0 auto 14px;
        }

        /* toast */
        .pf-toast {
          position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          background: var(--text);
          color: #fff;
          padding: 10px 18px;
          border-radius: 40px;
          font-size: 13px; font-weight: 500;
          display: flex; align-items: center; gap: 8px;
          z-index: 999;
          animation: toastIn .25s ease;
          white-space: nowrap;
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* error */
        .pf-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          color: var(--danger);
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 12px;
        }

        /* divider */
        .pf-divider {
          height: 1px; background: var(--border); margin: 16px 0;
        }

        /* scrollbar */
        .pf-uni-drop::-webkit-scrollbar { width: 4px; }
        .pf-uni-drop::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
      `}</style>

      <div className="profile-root">
        {/* ── Header ── */}
        <header className="pf-header">
          <button className="pf-icon-btn" onClick={() => navigate("/home")}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <span className="pf-header-title">My Profile</span>
          {!editing ? (
            <button className="pf-icon-btn" onClick={() => setEditing(true)} title="Edit profile">
              <FontAwesomeIcon icon={faPen} />
            </button>
          ) : (
            <button className="pf-icon-btn" onClick={cancelEdit} title="Cancel">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </header>

        <main className="pf-main">

          {/* ── Profile Card ── */}
          <div className="pf-card">

            {/* Avatar + name */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
              <div className="pf-avatar-wrap">
                <img src={avatar} alt="Profile" className="pf-avatar" />
                {editing && (
                  <button className="pf-avatar-btn" onClick={() => fileRef.current.click()} title="Change photo">
                    <FontAwesomeIcon icon={faCamera} />
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
              </div>

              {editing ? (
                <input
                  className="pf-input"
                  style={{ textAlign: "center", fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, marginTop: 12, maxWidth: 280 }}
                  value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                  placeholder="Your name"
                />
              ) : (
                <h2 style={{ fontFamily: "var(--font-head)", fontSize: 20, fontWeight: 700, marginTop: 12, color: "var(--text)" }}>
                  {pgUser?.displayName || "—"}
                </h2>
              )}

              {/* email */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, color: "var(--muted)", fontSize: 13 }}>
                <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: 11 }} />
                {user?.email}
              </div>

              {/* university badge */}
              {!editing && pgUser?.university && (
                <span className="pf-badge pf-badge-indigo" style={{ marginTop: 10 }}>
                  <FontAwesomeIcon icon={faBuildingColumns} style={{ fontSize: 11 }} />
                  {pgUser.university.shortName || pgUser.university.name}
                </span>
              )}

              {/* joined */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, color: "var(--muted)", fontSize: 12 }}>
                <FontAwesomeIcon icon={faCalendarDays} style={{ fontSize: 10 }} />
                Joined {fmt(pgUser?.createdAt)}
              </div>
            </div>

            {/* error */}
            {error && (
              <div className="pf-error">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                {error}
              </div>
            )}

            {/* edit fields */}
            {editing && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                {/* Bio */}
                <div>
                  <label className="pf-label">Bio</label>
                  <textarea
                    className="pf-input pf-textarea"
                    placeholder="Write something about yourself…"
                    value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    rows={3}
                  />
                </div>

                {/* University */}
                <div style={{ position: "relative" }}>
                  <label className="pf-label">
                    <FontAwesomeIcon icon={faBuildingColumns} style={{ marginRight: 5 }} />
                    University
                  </label>
                  <div style={{ position: "relative" }}>
                    <FontAwesomeIcon icon={faSearch} style={{
                      position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
                      color: "var(--muted)", fontSize: 12, pointerEvents: "none"
                    }} />
                    <input
                      className="pf-input"
                      style={{ paddingLeft: 34 }}
                      placeholder="Search your university…"
                      value={uniSearch}
                      onChange={e => { setUniSearch(e.target.value); setUniOpen(true); }}
                      onFocus={() => setUniOpen(true)}
                    />
                  </div>
                  {uniOpen && uniSearch.length > 0 && filteredUnis.length > 0 && (
                    <div className="pf-uni-drop">
                      {filteredUnis.map(u => (
                        <div
                          key={u.id}
                          className={cls("pf-uni-item", form.universityId === u.id && "active")}
                          onClick={() => {
                            setForm(f => ({ ...f, universityId: u.id }));
                            setUniSearch(u.name);
                            setUniOpen(false);
                          }}
                        >
                          <FontAwesomeIcon icon={faBuildingColumns} style={{ fontSize: 12, color: "var(--accent)", flexShrink: 0 }} />
                          <span>{u.name}{u.shortName ? ` (${u.shortName})` : ""}</span>
                          {form.universityId === u.id && (
                            <FontAwesomeIcon icon={faCircleCheck} style={{ marginLeft: "auto", color: "var(--accent)" }} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Faculty + Department */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label className="pf-label">
                      <FontAwesomeIcon icon={faUserGraduate} style={{ marginRight: 5 }} />
                      Faculty
                    </label>
                    <input className="pf-input" placeholder="e.g. Engineering" value={form.faculty}
                      onChange={e => setForm(f => ({ ...f, faculty: e.target.value }))} />
                  </div>
                  <div>
                    <label className="pf-label">Department</label>
                    <input className="pf-input" placeholder="e.g. Computer Sci." value={form.department}
                      onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
                  </div>
                </div>

                <div className="pf-divider" />

                {/* Save */}
                <button className="pf-save-btn" onClick={handleSave} disabled={saving}>
                  {saving
                    ? <><FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Saving…</>
                    : <><FontAwesomeIcon icon={faFloppyDisk} /> Save Changes</>
                  }
                </button>
              </div>
            )}

            {/* view mode: bio + badges */}
            {!editing && (
              <>
                {pgUser?.bio && (
                  <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6, textAlign: "center", marginBottom: 14 }}>
                    {pgUser.bio}
                  </p>
                )}
                {(pgUser?.faculty || pgUser?.department) && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                    {pgUser.faculty && (
                      <span className="pf-badge pf-badge-purple">
                        <FontAwesomeIcon icon={faUserGraduate} style={{ fontSize: 10 }} />
                        {pgUser.faculty}
                      </span>
                    )}
                    {pgUser.department && (
                      <span className="pf-badge pf-badge-pink">
                        {pgUser.department}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Stats ── */}
          <div className="pf-stats">
            {[
              { label: "Files",    value: stats?.files    || 0, icon: faFile,      color: "#4f46e5", delay: ".05s" },
              { label: "Streak",   value: pgUser?.streakCount || 0, icon: faFire,  color: "#f59e0b", delay: ".1s" },
              { label: "Products", value: stats?.products || 0, icon: faShoppingBag, color: "#ec4899", delay: ".15s" },
              { label: "Messages", value: stats?.messages || 0, icon: faMessage,   color: "#22c55e", delay: ".2s" },
            ].map((s, i) => (
              <div key={i} className="pf-stat-card" style={{ animationDelay: s.delay }}>
                <div className="pf-stat-icon" style={{ color: s.color }}>
                  <FontAwesomeIcon icon={s.icon} />
                </div>
                <div className="pf-stat-val">{s.value}</div>
                <div className="pf-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* leaderboard score */}
          {stats?.leaderboardScore > 0 && (
            <div className="pf-card" style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", marginBottom: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "linear-gradient(135deg,#fbbf24,#f59e0b)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 18
              }}>
                <FontAwesomeIcon icon={faMedal} />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 700 }}>
                  {stats.leaderboardScore.toLocaleString()} pts
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Leaderboard score</div>
              </div>
              <FontAwesomeIcon icon={faChartBar} style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 14 }} />
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="pf-tabs">
            <button className={cls("pf-tab", activeTab === "materials" && "active")}
              onClick={() => setActiveTab("materials")}>
              <FontAwesomeIcon icon={faBookOpen} />
              Study Materials
            </button>
            <button className={cls("pf-tab", activeTab === "listings" && "active")}
              onClick={() => setActiveTab("listings")}>
              <FontAwesomeIcon icon={faShoppingBag} />
              Listings
            </button>
          </div>

          {/* ── Materials Tab ── */}
          {activeTab === "materials" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {materials.length === 0 ? (
                <div className="pf-empty">
                  <div className="pf-empty-icon">
                    <FontAwesomeIcon icon={faBookOpen} />
                  </div>
                  <p style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                    No materials yet
                  </p>
                  <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
                    Upload study materials to share with your campus
                  </p>
                  <Link to="/study-material" style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    padding: "9px 20px",
                    background: "var(--accent)", color: "#fff",
                    borderRadius: 40, fontSize: 13, fontWeight: 600,
                    textDecoration: "none", transition: "background .18s"
                  }}>
                    <FontAwesomeIcon icon={faFile} />
                    Upload a File
                  </Link>
                </div>
              ) : (
                materials.map((m, i) => (
                  <div key={m.id} className="pf-material-card" style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className="pf-material-icon">
                      <FontAwesomeIcon icon={fileIcon(m.fileType)} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {m.title}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        {m.faculty || "—"} · {new Date(m.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                      <span className={cls("pf-badge", m.isPublic ? "pf-badge-green" : "pf-badge-gray")}>
                        <FontAwesomeIcon icon={m.isPublic ? faGlobe : faLock} style={{ fontSize: 9 }} />
                        {m.isPublic ? "Public" : "Private"}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                        <FontAwesomeIcon icon={faDownload} style={{ fontSize: 9 }} />
                        {m.downloadCount || 0}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Listings Tab ── */}
          {activeTab === "listings" && (
            <div className="pf-empty">
              <div className="pf-empty-icon">
                <FontAwesomeIcon icon={faShoppingBag} />
              </div>
              <p style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                No listings yet
              </p>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
                List items on the marketplace to sell to fellow students
              </p>
              <Link to="/marketplace" style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "9px 20px",
                background: "var(--accent)", color: "#fff",
                borderRadius: 40, fontSize: 13, fontWeight: 600,
                textDecoration: "none"
              }}>
                <FontAwesomeIcon icon={faShoppingBag} />
                Go to Marketplace
              </Link>
            </div>
          )}

        </main>

        {/* ── Toast ── */}
        {saveOk && (
          <div className="pf-toast">
            <FontAwesomeIcon icon={faCircleCheck} style={{ color: "#4ade80" }} />
            Profile saved successfully
          </div>
        )}
      </div>
    </>
  );
}
