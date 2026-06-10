import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { auth, db } from "./firebase";
import { apiGet, apiPatch, updateMe, getUniversityByName } from "./api";
import { useNavigate, useLocation, Link } from "react-router-dom";
import NotificationPanel from "./NotificationPanel";
import { useNotifications } from "./useNotifications";
import { signOut, getIdToken } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRobot, faBookOpen, faCartShopping, faComments, faBookmark,
  faCamera, faBagShopping, faMessage, faFile,
  faHouse, faBook, faStore, faBell, faSearch, faBars, faXmark,
} from '@fortawesome/free-solid-svg-icons';
import AppTour from "./components/AppTour/AppTour";

// ─── Shared Nav Links ──────────────────────────────────────────────
const TAB_LINKS = [
  { href: "/home",           label: "Home",   icon: faHouse },
  { href: "/study-material", label: "Study",  icon: faBook,     tour: "nav-study" },
  { href: "/ai",             label: "AI",     icon: faRobot,    tour: "nav-ai" },
  { href: "/chat",           label: "Chat",   icon: faComments, tour: "nav-chat" },
  { href: "/marketplace",    label: "Market", icon: faStore,    tour: "nav-market" },
];

function Toast({ message, onClose }) {
  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#0d0d14] border border-white/10 inline-flex space-x-3 p-3 text-sm rounded-2xl shadow-lg whitespace-nowrap">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M16.5 8.31V9a7.5 7.5 0 1 1-4.447-6.855M16.5 3 9 10.508l-2.25-2.25" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <h3 className="text-white font-medium">Login Successful!</h3>
        <p className="text-white/50">Welcome back, {message}</p>
      </div>
      <button onClick={onClose} className="cursor-pointer mb-auto text-white/30 hover:text-white/60 transition">
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </div>
  );
}

function AnimatedNumber({ target }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 30);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{count}</span>;
}

function SkeletonCard() {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
      <div className="h-3 bg-white/10 rounded w-2/3 mb-2" />
      <div className="h-3 bg-white/10 rounded w-1/2" />
    </div>
  );
}

function StudyTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const progress = Math.min((seconds / 7200) * 100, 100);
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
          <circle cx="28" cy="28" r="24" fill="none" stroke="#a78bfa" strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 24}`}
            strokeDashoffset={`${2 * Math.PI * 24 * (1 - progress / 100)}`}
            strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-violet-400">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="flex-1">
        <p className="text-xs text-white/30 mb-1">Study timer</p>
        <p className="text-lg font-bold text-white">
          {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
        </p>
      </div>
      <button
        onClick={() => setRunning(r => !r)}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${running ? "bg-pink-500/20 text-pink-400 hover:bg-pink-500/30" : "bg-violet-500 text-white hover:bg-violet-400"}`}
      >
        {running ? "Pause" : "Start"}
      </button>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <p className="text-xs text-white/30">
      {now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} — {now.toLocaleTimeString()}
    </p>
  );
}

function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showToast, setShowToast] = useState(() => !!location.state?.fromLogin);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({ files: 0, aiQuestions: 0, products: 0, messages: 0 });
  const [streak, setStreak] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);
  const [lastMaterial, setLastMaterial] = useState(null);
  const [quote] = useState({ text: "The secret of getting ahead is getting started.", author: "Mark Twain" });
  const [leaderboardRank, setLeaderboardRank] = useState(null);
  const { unreadCount } = useNotifications();
  const [, setLastMarketplace] = useState(null);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  useEffect(() => {
    const t = setTimeout(() => setShowToast(false), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      try {
        const pgUser = await apiGet("/users/me");
        if (!pgUser.universityId) {
          const firestoreUser = await getDoc(doc(db, "users", user.uid));
          if (firestoreUser.exists()) {
            const data = firestoreUser.data();
            if (data.university) {
              const uni = await getUniversityByName(data.university);
              if (uni) await updateMe({ universityId: uni.id, faculty: data.faculty || null, department: data.department || null });
            }
          }
        }
        const statsData = await apiGet("/users/me/stats");
        setStats({ files: statsData.files ?? 0, aiQuestions: 0, products: statsData.products ?? 0, messages: statsData.messages ?? 0 });
        if (statsData.leaderboardScore > 0) setLeaderboardRank(1);
        setStreak(pgUser.streakCount || 0);
        try { const activityData = await apiGet("/users/me/activity"); setRecentActivity(activityData); } catch { setRecentActivity([]); }
        try { const myMaterials = await apiGet("/study-material/my"); if (myMaterials.length > 0) setLastMaterial(myMaterials[0]); } catch { setLastMaterial(null); }
        try { const marketplace = await apiGet("/marketplace/my"); if (marketplace.length > 0) setLastMarketplace(marketplace[0]); } catch { setLastMarketplace(null); }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [user]);

  const handleLogout = async () => { await signOut(auth); navigate("/"); };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const token = await getIdToken(auth.currentUser, true);
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/upload/single?folder=profile`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      const uploadData = await uploadRes.json();
      await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ photoURL: uploadData.url }),
      });
      window.location.reload();
    } catch (err) { console.error(err); }
  };

  const activityIcon = (type) => {
    if (type === "upload") return <FontAwesomeIcon icon={faFile} />;
    if (type === "ai") return <FontAwesomeIcon icon={faRobot} />;
    if (type === "marketplace") return <FontAwesomeIcon icon={faBagShopping} />;
    if (type === "chat") return <FontAwesomeIcon icon={faMessage} />;
    return "";
  };

  const timeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const cards = [
    { title: "Study Material", icon: <FontAwesomeIcon icon={faBookOpen} className="text-violet-400 text-2xl" />, href: "/study-material", content: lastMaterial ? `Last uploaded: ${lastMaterial.title}` : "No file uploaded yet.\nNo file viewed yet." },
    { title: "AI Assistant", icon: <FontAwesomeIcon icon={faRobot} className="text-violet-400 text-2xl" />, href: "/ai", content: `${greeting()}, ${user?.displayName?.split(" ")[0] || "there"}! Ready to help you study smarter today.` },
    { title: "Marketplace", icon: <FontAwesomeIcon icon={faCartShopping} className="text-violet-400 text-2xl" />, href: "/marketplace", content: "Browse and list items for your campus community." },
    { title: "Chat", icon: <FontAwesomeIcon icon={faComments} className="text-violet-400 text-2xl" />, href: "/chat", content: "Connect and study with students from your university." },
  ];

  const sidebarLinks = [
    { name: "Home", href: "/home", icon: faHouse },
    { name: "Study Material", href: "/study-material", icon: faBook },
    { name: "AI Assistant", href: "/ai", icon: faRobot },
    { name: "Chat", href: "/chat", icon: faComments },
    { name: "Marketplace", href: "/marketplace", icon: faStore },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
        <div className="absolute top-1/2 -right-20 w-72 h-72 bg-emerald-500 rounded-full opacity-[0.06] blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-pink-500 rounded-full opacity-[0.06] blur-[100px]" />
      </div>

      {/* HEADER */}
      <header className="fixed top-0 left-0 w-full z-40 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between px-4 py-2.5">

            {/* Logo + menu — tour target: sidebar */}
            <div data-tour="sidebar" className="flex items-center gap-3">
              <button onClick={() => setMenuOpen(true)} className="text-white/40 hover:text-violet-400 transition">
                <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-black tracking-tight">
                TEST<span className="text-violet-400">YOURSELF</span>
              </h1>
            </div>

            <div className="flex items-center gap-3">

              {/* Search — tour target: global-search */}
              <Link
                data-tour="global-search"
                to="/search"
                className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/40 hover:text-violet-400 hover:border-violet-500/40 transition"
              >
                <FontAwesomeIcon icon={faSearch} className="w-4 h-4" />
              </Link>

              <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/40 hover:text-violet-400 hover:border-violet-500/40 transition">
                  <FontAwesomeIcon icon={faBell} className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">{unreadCount}</span>
                  )}
                </button>
                {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
              </div>

              {/* Avatar — tour target: user-avatar */}
              <Link data-tour="user-avatar" to="/profile">
                {user?.photoURL
                  ? <img src={user.photoURL} alt="Profile" className="w-9 h-9 rounded-xl object-cover border border-white/10" />
                  : <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.displayName || user?.email || "?")}`} alt="Profile" className="w-9 h-9 rounded-xl border border-white/10" />
                }
              </Link>
            </div>
          </div>

          {/* Nav tabs */}
          <div className="flex items-center justify-around border-t border-white/5 px-2">
            {TAB_LINKS.map((tab) => {
              const isActive = location.pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  to={tab.href}
                  data-tour={tab.tour || undefined}
                  className={`flex flex-col items-center py-2 px-4 border-b-2 transition text-xs gap-0.5 ${isActive ? "border-violet-500 text-violet-400" : "border-transparent text-white/30 hover:text-white/60"}`}
                >
                  <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {showToast && <Toast message={user?.displayName || user?.email} onClose={() => setShowToast(false)} />}

      {/* OVERLAY */}
      {menuOpen && <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />}

      {/* SIDEBAR DRAWER */}
      <aside className={`fixed top-0 left-0 h-full w-72 z-50 bg-[#0d0d14] border-r border-white/5 shadow-2xl transform transition-transform duration-300 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <label className="relative cursor-pointer group">
              {user?.photoURL
                ? <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                : <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.displayName || user?.email || "?")}`} alt="Profile" className="w-10 h-10 rounded-xl border border-white/10" />
              }
              <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <FontAwesomeIcon icon={faCamera} className="text-white text-xs" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
            <div>
              <p className="text-sm font-semibold text-white">{user?.displayName || "User"}</p>
              <p className="text-xs text-white/30">{user?.email}</p>
            </div>
          </div>
          <button onClick={() => setMenuOpen(false)} className="text-white/30 hover:text-white transition">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <nav className="flex flex-col px-4 py-4 gap-1">
          {sidebarLinks.map((link) => (
            <Link key={link.name} to={link.href} onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${location.pathname === link.href ? "bg-violet-500/15 text-violet-400 border border-violet-500/20" : "text-white/50 hover:bg-white/5 hover:text-white"}`}>
              <FontAwesomeIcon icon={link.icon} className="w-4 h-4" />
              {link.name}
            </Link>
          ))}
          {user?.email === "omisope34@gmail.com" && (
            <Link to="/admin" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white transition">
              ⚙️ Admin Dashboard
            </Link>
          )}
        </nav>
        <div className="absolute bottom-6 left-0 w-full px-6">
          <button onClick={handleLogout} className="w-full py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/50 text-sm hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition">
            Logout
          </button>
        </div>
      </aside>

      {/* PAGE CONTENT */}
      <main className="relative z-10 pt-28 px-4 pb-16 max-w-6xl mx-auto">

        {/* Welcome */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/25 rounded-full px-4 py-1.5 text-xs text-violet-400 font-medium mb-3">
            <span>🔥</span>
            <span>Welcome back, {user?.displayName || user?.email}</span>
          </div>
          <p className="text-sm italic text-white/30 mb-1">Study smarter. Learn together. Test yourself daily.</p>
          <LiveClock />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Streak + Leaderboard */}
            <div className="flex gap-3">
              <div className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-violet-400">🔥 {streak}</p>
                <p className="text-xs text-white/30 mt-1">Day streak</p>
              </div>
              {leaderboardRank && (
                <div className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold text-violet-400">#{leaderboardRank}</p>
                  <p className="text-xs text-white/30 mt-1">Leaderboard rank</p>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Files uploaded", value: stats.files, icon: faFile },
                { label: "AI questions", value: stats.aiQuestions, icon: faRobot },
                { label: "Products listed", value: stats.products, icon: faBagShopping },
                { label: "Messages sent", value: stats.messages, icon: faMessage },
              ].map((stat, i) => (
                loading ? <SkeletonCard key={i} /> : (
                  <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-center">
                    <p className="text-xl mb-1 text-violet-400"><FontAwesomeIcon icon={stat.icon} /></p>
                    <p className="text-2xl font-bold text-white"><AnimatedNumber target={stat.value} /></p>
                    <p className="text-xs text-white/30 mt-1">{stat.label}</p>
                  </div>
                )
              ))}
            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-xs font-semibold text-white/30 tracking-widest uppercase mb-3">Recent Activity</h2>
              {loading ? [1, 2, 3].map(i => <SkeletonCard key={i} />) :
                recentActivity.length === 0 ? (
                  <p className="text-sm text-white/20 text-center py-4">No recent activity yet.</p>
                ) : (
                  recentActivity.map((item) => (
                    <Link key={item.id} to={item.href || "#"}
                      className="flex items-start gap-3 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 mb-2 hover:border-violet-500/30 hover:bg-violet-500/5 transition">
                      <span className="text-violet-400 mt-0.5">{activityIcon(item.type)}</span>
                      <div>
                        <p className="text-sm text-white/70">{item.description}</p>
                        <p className="text-xs text-white/30 mt-0.5">{timeAgo(item.createdAt)}</p>
                      </div>
                    </Link>
                  ))
                )
              }
            </div>

            {/* Module Cards */}
            <div>
              <h2 className="text-xs font-semibold text-white/30 tracking-widest uppercase mb-3">Your Modules</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cards.map((card, index) => (
                  loading ? <SkeletonCard key={index} /> : (
                    <Link key={index} to={card.href}
                      className="block bg-white/[0.03] border border-white/10 rounded-2xl p-5 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all duration-300 hover:scale-[1.02]">
                      <div className="flex items-center gap-2 mb-3">
                        <span>{card.icon}</span>
                        <h3 className="text-white font-bold text-sm">{card.title}</h3>
                      </div>
                      <p className="text-white/40 text-sm whitespace-pre-line">{card.content}</p>
                    </Link>
                  )
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-5">
            <StudyTimer />

            {/* Quote */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
              <p className="text-xs font-semibold text-white/30 tracking-widest uppercase mb-2">Quote of the day</p>
              <p className="text-sm text-white/60 italic">"{quote.text}"</p>
              <p className="text-xs text-white/30 mt-1 text-right">— {quote.author}</p>
            </div>

            {/* Shortcuts */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
              <p className="text-xs font-semibold text-white/30 tracking-widest uppercase mb-3">Quick shortcuts</p>
              <div className="flex flex-col gap-2">
                <Link to="/study-material" className="text-sm text-violet-400 hover:text-violet-300 transition flex items-center gap-2"><FontAwesomeIcon icon={faBookmark} />Go to Study Material</Link>
                <Link to="/ai" className="text-sm text-violet-400 hover:text-violet-300 transition flex items-center gap-2"><FontAwesomeIcon icon={faRobot} />Resume AI conversation</Link>
                <Link to="/chat" className="text-sm text-violet-400 hover:text-violet-300 transition flex items-center gap-2"><FontAwesomeIcon icon={faMessage} />Open Chat</Link>
                <Link to="/marketplace" className="text-sm text-violet-400 hover:text-violet-300 transition flex items-center gap-2"><FontAwesomeIcon icon={faBagShopping} />Browse Marketplace</Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/5 px-4 py-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-lg font-black tracking-tight">TEST<span className="text-violet-400">YOURSELF</span></h2>
            <p className="text-sm text-white/30 max-w-80">A smart educational platform designed to help students store, organise, and interact with learning materials.</p>
          </div>
          <div className="lg:col-span-3 grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-xs text-white/30 uppercase tracking-widest mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-white/50">
                <li><Link to="/study-material" className="hover:text-violet-400 transition">Study Material</Link></li>
                <li><Link to="/ai" className="hover:text-violet-400 transition">AI</Link></li>
                <li><Link to="/marketplace" className="hover:text-violet-400 transition">Marketplace</Link></li>
                <li><Link to="/chat" className="hover:text-violet-400 transition">Chat</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-xs text-white/30 uppercase tracking-widest mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-white/50">
                <li><a href="#" className="hover:text-violet-400 transition">About</a></li>
                <li><a href="#" className="hover:text-violet-400 transition">Vision</a></li>
                <li><a href="#" className="hover:text-violet-400 transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-violet-400 transition">Contact Us</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-4 border-t border-white/5 flex justify-between items-center">
          <p className="text-white/20 text-sm">© 2026 TestYourSelf</p>
          <p className="text-sm text-white/20">All rights reserved.</p>
        </div>
        <h1 className="text-center font-extrabold leading-[0.7] text-transparent text-[clamp(3rem,15vw,15rem)] [-webkit-text-stroke:1px_rgba(255,255,255,0.05)] mt-6 select-none">
          TestYourSelf
        </h1>
      </footer>

      {/* ONBOARDING TOUR — auto-starts once for new users */}
      <AppTour autoStart={true} />

    </div>
  );
}

export default Home;
