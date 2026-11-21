import { useState } from "react";
import { useAuth } from "./useAuth";
import { auth } from "./firebase";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import NotificationPanel from "./NotificationPanel";
import { useNotifications } from "./useNotifications";
import ThemeToggle from "./components/ThemeToggle";
import { TAB_LINKS, SIDEBAR_LINKS } from "./onboarding/navLinks";
import { useOnboarding, useMenuEvent } from "./onboarding/context";
import { NewBadge, NewDot } from "./onboarding/NewBadge";
import HelpMenu from "./onboarding/HelpMenu";
import { getAccessToken } from "./token";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCamera,
  faBell, faSearch, faBars, faXmark,
  } from "@fortawesome/free-solid-svg-icons";

// ─── Shared Nav Links ──────────────────────────────────────────────
// Single source of truth now — update here and every page picks it up.




export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotifications();
  const { isNew, unseen } = useOnboarding();
  useMenuEvent(setMenuOpen);

  const handleLogout = async () => {
    await logout();
    await signOut(auth).catch(() => {});
    navigate("/");
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const token = getAccessToken();
      const formData = new FormData();
      formData.append("file", file);
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const uploadRes = await fetch(`${apiUrl}/upload/single?folder=profile-pictures`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const uploadData = await uploadRes.json();
      await fetch(`${apiUrl}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ photoURL: uploadData.url }),
      });
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {/* HEADER */}
      <header className="fixed top-0 left-0 w-full z-40 bg-bg border-b border-ink/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div data-tour="sidebar" className="flex items-center gap-3">
              <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="relative text-ink/40 hover:text-violet-400 transition">
                <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
                {unseen.length > 0 && <NewDot className="absolute -right-1 -top-1" />}
              </button>
              <h1 className="text-lg font-black tracking-tight">
                UNI<span className="text-violet-400">LIB</span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                data-tour="global-search" aria-label="Search"
                to="/search"
                className="w-9 h-9 bg-white/5 border border-ink/10 rounded-xl flex items-center justify-center text-ink/40 hover:text-violet-400 hover:border-violet-500/40 transition"
              >
                <FontAwesomeIcon icon={faSearch} className="w-4 h-4" />
              </Link>

              <div className="relative" data-tour="notifications">
                <button aria-label="Notifications" onClick={() => setShowNotifications(!showNotifications)} className="w-9 h-9 bg-white/5 border border-ink/10 rounded-xl flex items-center justify-center text-ink/40 hover:text-violet-400 hover:border-violet-500/40 transition">
                  <FontAwesomeIcon icon={faBell} className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">{unreadCount}</span>
                  )}
                </button>
                {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
              </div>

              <Link data-tour="user-avatar" to="/profile">
                {user?.photoURL
                  ? <img src={user.photoURL} alt="Profile" className="w-9 h-9 rounded-xl object-cover border border-ink/10" />
                  : <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.displayName || user?.email || "?")}`} alt="Profile" className="w-9 h-9 rounded-xl border border-ink/10" />
                }
              </Link>
            </div>
          </div>

          {/* Nav tabs */}
          <div className="flex items-stretch border-t border-line">
            {TAB_LINKS.map((tab) => {
              const isActive = location.pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  to={tab.href}
                  data-tour={`tab-${tab.id}`}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 border-b-2 px-1 py-2 text-xs transition ${isActive ? "border-violet-500 text-violet-400" : "border-transparent text-muted hover:text-ink"}`}
                >
                  <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                  <span className="relative">{tab.label}{isNew(tab.feature) && <NewDot className="absolute -right-3 -top-1" />}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* OVERLAY */}
      {menuOpen && <div className="fixed inset-0 bg-black/60 z-40 " onClick={() => setMenuOpen(false)} />}

      {/* SIDEBAR DRAWER */}
      <aside className={`fixed top-0 left-0 h-full w-72 z-50 flex flex-col bg-bg-elevated border-r border-ink/5 shadow-2xl transform transition-transform duration-300 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex shrink-0 items-center justify-between px-6 py-4 border-b border-ink/5">
          <div className="flex items-center gap-3">
            <label className="relative cursor-pointer group">
              {user?.photoURL
                ? <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-xl object-cover border border-ink/10" />
                : <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.displayName || user?.email || "?")}`} alt="Profile" className="w-10 h-10 rounded-xl border border-ink/10" />
              }
              <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <FontAwesomeIcon icon={faCamera} className="text-white text-xs" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
            <div>
              <p className="text-sm font-semibold text-ink">{user?.displayName || "User"}</p>
              <p className="text-xs text-ink/30">{user?.email}</p>
            </div>
          </div>
          <button aria-label="Close" onClick={() => setMenuOpen(false)} className="text-ink/30 hover:text-ink transition">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <nav className="flex flex-col px-4 py-4 gap-1">
          {SIDEBAR_LINKS.map((link) => (
            <Link key={link.name} to={link.href} data-tour={`side-${link.id}`} onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${location.pathname === link.href ? "bg-violet-500/15 text-violet-400 border border-violet-500/20" : "text-ink/50 hover:bg-white/5 hover:text-ink"}`}>
              <FontAwesomeIcon icon={link.icon} className="w-4 h-4" />
              {link.name}
              {isNew(link.feature) && <NewBadge className="ml-auto" />}
            </Link>
          ))}
          {user?.email === "omisope34@gmail.com" && (
            <Link to="/admin" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-ink/50 hover:bg-white/5 hover:text-ink transition">
              ⚙️ Admin Dashboard
            </Link>
          )}
        </nav>
        <HelpMenu onDone={() => setMenuOpen(false)} />

        <div className="px-6 mt-2">
          <p className="text-xs text-ink/30 uppercase tracking-widest mb-2">Appearance</p>
          <ThemeToggle />
        </div>
        </div>
        <div className="shrink-0 border-t border-ink/5 px-6 py-4">
          <button onClick={handleLogout} className="w-full py-2.5 rounded-2xl bg-white/5 border border-ink/10 text-ink/50 text-sm hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition">
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
