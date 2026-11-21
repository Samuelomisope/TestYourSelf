import { getAccessToken } from "./token";
import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { auth, db } from "./firebase";
import HomeStudyBar from "./library/HomeStudyBar";
import { daysToExam, examLabel } from "./library/continueView.js";
import { apiGet, updateMe, getUniversityByName } from "./api";
import { useNavigate, useLocation, Link } from "react-router-dom";
import NotificationPanel from "./NotificationPanel";
import { useNotifications } from "./useNotifications";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRobot, faBookOpen, faCartShopping, faComments, faBookmark,
  faCamera, faBagShopping, faMessage, faFile, faBell, faSearch, faBars, faXmark,
  faLayerGroup, } from '@fortawesome/free-solid-svg-icons';
import ThemeToggle from "./components/ThemeToggle";
import { TAB_LINKS, SIDEBAR_LINKS } from "./onboarding/navLinks";
import { useOnboarding, useMenuEvent } from "./onboarding/context";
import { NewBadge, NewDot } from "./onboarding/NewBadge";
import HelpMenu from "./onboarding/HelpMenu";

// ─── Shared Nav Links ──────────────────────────────────────────────


function Toast({ message, onClose }) {
  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-bg-elevated border border-ink/10 inline-flex space-x-3 p-3 text-sm rounded-2xl shadow-lg whitespace-nowrap">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M16.5 8.31V9a7.5 7.5 0 1 1-4.447-6.855M16.5 3 9 10.508l-2.25-2.25" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <h3 className="text-ink font-medium">Login Successful!</h3>
        <p className="text-ink/50">Welcome back, {message}</p>
      </div>
      <button onClick={onClose} aria-label="Dismiss" className="cursor-pointer mb-auto text-ink/30 hover:text-ink/60 transition">
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </div>
  );
}

const timeAgo = (dateStr) => {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const EXPLORE = [
  { title: "Study Materials", hint: "Notes, slides and past questions", href: "/study-material", icon: faBook },
  { title: "UniLib AI", hint: "Ask questions about your notes", href: "/ai", icon: faRobot },
  { title: "AI Study Tools", hint: "Quizzes, summaries and explanations", href: "/ai", icon: faWandMagicSparkles },
  { title: "Flashcards", hint: "Spaced repetition decks", href: "/flashcards", icon: faLayerGroup },
  { title: "Study Plans", hint: "A day-by-day plan to your exam", href: "/study-plan", icon: faCalendarCheck },
  { title: "Past questions", hint: "Timed exam practice", href: "/practice", icon: faStopwatch },
  { title: "Marketplace", hint: "Buy and sell on campus", href: "/marketplace", icon: faCartShopping },
  { title: "Chat", hint: "Talk to students at your school", href: "/chat", icon: faComments },
  { title: "Novels", hint: "Read and write stories", href: "/novels", icon: faBookOpen },
];

function LoadError({ what, onRetry }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm">
      <span>Couldn't load {what}.</span>
      <button onClick={onRetry} className="min-h-9 rounded-lg px-3 font-medium text-violet-400 hover:text-violet-300">Try again</button>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white/[0.03] border border-ink/10 rounded-2xl p-5 animate-pulse">
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
    <div className="bg-white/[0.03] border border-ink/10 rounded-2xl p-4 flex items-center gap-4">
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
        <p className="text-xs text-ink/30 mb-1">Study timer</p>
        <p className="text-lg font-bold text-ink">
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

function computePlanProgress(plan) {
  if (!plan) return 0;
  const entries = plan.entries || [];
  const totalTasks = entries.reduce((sum, e) => sum + (e.tasks?.length || 0), 0);
  if (totalTasks === 0) return 0;
  const completed = plan.completedTasks || {};
  const completedCount = Object.values(completed).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  return Math.round((completedCount / totalTasks) * 100);
}

function TodayStudyCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/ai/study-plan/current")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonCard />;

  if (!data || !data.plan) {
    return (
      <Link to="/ai" className="block bg-white/[0.03] border border-ink/10 rounded-2xl p-5 hover:border-violet-500/30 hover:bg-violet-500/5 transition">
        <p className="text-xs font-semibold text-violet-400 tracking-widest uppercase mb-2">Study Plan</p>
        <p className="text-sm text-ink/50">No active study plan yet — create one to get a daily focus here.</p>
      </Link>
    );
  }

  if (!data.todayEntry) {
    return (
      <div className="bg-white/[0.03] border border-ink/10 rounded-2xl p-5">
        <p className="text-xs font-semibold text-violet-400 tracking-widest uppercase mb-2">Study Plan</p>
        <p className="text-sm text-ink/50">Your plan for "{data.plan.subject}" has ended. Time to make a new one.</p>
      </div>
    );
  }

   return (
    <div className="bg-white/[0.03] border border-violet-500/20 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-violet-400 tracking-widest uppercase">
          {data.plan.subject} — Day {data.dayNumber} of {data.plan.daysAvailable}
          {examLabel(daysToExam(data.plan.examDate)) && <span className="ml-2 rounded-full bg-violet-500/15 px-2 py-0.5 normal-case tracking-normal">{examLabel(daysToExam(data.plan.examDate))}</span>}
        </p>
        <Link to="/study-plan" className="text-xs text-violet-400 hover:text-violet-300 font-medium transition">
          View Full Study Plan →
        </Link>
      </div>
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-violet-500 rounded-full transition-all"
          style={{ width: `${computePlanProgress(data.plan)}%` }}
        />
      </div>
      <p className="text-ink font-bold mb-2">{data.todayEntry.focus}</p>
      <ul className="space-y-1.5">
        {data.todayEntry.tasks.map((t, i) => (
          <li key={i} className="text-sm text-ink/60 flex items-start gap-2">
            <span className="text-violet-400 mt-0.5">•</span>{t}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showToast, setShowToast] = useState(() => !!location.state?.fromLogin);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [streak, setStreak] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);

  const [activityDays, setActivityDays] = useState(7);
  const { unreadCount } = useNotifications();
  const { isNew, unseen } = useOnboarding();
  useMenuEvent(setMenuOpen);
  const [lastMarketplace, setLastMarketplace] = useState(null);

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

        if (pgUser.firebaseUid && !pgUser.universityId) {
          const firestoreUser = await getDoc(doc(db, "users", pgUser.firebaseUid));
          if (firestoreUser.exists()) {
            const data = firestoreUser.data();
            if (data.university) {
              const uni = await getUniversityByName(data.university);
              if (uni) await updateMe({ universityId: uni.id, faculty: data.faculty || null, department: data.department || null });
            }
          }
        }

        setStreak(pgUser.streakCount || 0);
        try {
          const statsData = await apiGet("/users/me/stats");
          setStats({ files: statsData.files ?? 0, products: statsData.products ?? 0, messages: statsData.messages ?? 0 });
          setStatsError(false);
        } catch { setStats(null); setStatsError(true); }

      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [user, reloadKey]);
  const handleLogout = async () => {
  await logout();
  await signOut(auth).catch(() => {});
  navigate("/");
};


const [activityLoading, setActivityLoading] = useState(true);
const [activityError, setActivityError] = useState(false);

useEffect(() => {
    if (!user) return;
    const fetchActivity = async () => {
      setActivityLoading(true);
      try {
        const activityData = await apiGet(`/users/me/activity?days=${activityDays}`);
        setRecentActivity(activityData);
        setActivityError(false);
      } catch {
        setRecentActivity([]);
        setActivityError(true);
      } finally {
        setActivityLoading(false);
      }
    };
    fetchActivity();
  }, [user, activityDays, reloadKey]);
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const token = getAccessToken();
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/upload/single?folder=profile-pictures`, {
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


  const cards = [
    { title: "Study Material", icon: <FontAwesomeIcon icon={faBookOpen} className="text-violet-400 text-2xl" />, href: "/study-material", content: lastMaterial ? `Last uploaded: ${lastMaterial.title}` : "No file uploaded yet.\nNo file viewed yet." },
    { title: "AI Assistant", icon: <FontAwesomeIcon icon={faRobot} className="text-violet-400 text-2xl" />, href: "/ai", content: `${greeting()}, ${user?.displayName?.split(" ")[0] || "there"}! Ready to help you study smarter today.` },
    { title: "Marketplace", icon: <FontAwesomeIcon icon={faCartShopping} className="text-violet-400 text-2xl" />, href: "/marketplace", content: "Browse and list items for your campus community." },
    { title: "Chat", icon: <FontAwesomeIcon icon={faComments} className="text-violet-400 text-2xl" />, href: "/chat", content: "Connect and study with students from your university." },
    { title: "Flashcards", icon: <FontAwesomeIcon icon={faLayerGroup} className="text-violet-400 text-2xl" />, href: "/flashcards", content: "Create and study with flashcards." },
  ];


  return (
    <div className="min-h-screen bg-bg text-ink">

      {/* HEADER */}
      <header className="fixed top-0 left-0 w-full z-40 bg-bg border-b border-line">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between px-4 py-2.5">

            {/* Logo + menu — tour target: sidebar */}
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

              {/* Search — tour target: global-search */}
              <Link
                data-tour="global-search"
                to="/search" aria-label="Search"
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

              {/* Avatar — tour target: user-avatar */}
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
                  className={`flex flex-col items-center py-2 px-4 border-b-2 transition text-xs gap-0.5 ${isActive ? "border-violet-500 text-violet-400" : "border-transparent text-ink/30 hover:text-ink/60"}`}
                >
                  <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                  <span className="relative">{tab.label}{isNew(tab.feature) && <NewDot className="absolute -right-1.5 -top-2" />}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {showToast && <Toast message={user?.displayName || user?.email} onClose={() => setShowToast(false)} />}

      {/* OVERLAY */}
      {menuOpen && <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setMenuOpen(false)} />}

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
          <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="grid h-10 w-10 place-items-center text-muted hover:text-ink transition">
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

      {/* PAGE CONTENT */}
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-28">

        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">{greeting()}, {user?.displayName?.split(" ")[0] || "there"}</h2>
          <p className="mt-1 text-sm text-muted">Pick up where you left off.</p>
        </div>

        {/* Continue learning */}
        <section aria-labelledby="continue-h" className="mb-8">
          <h3 id="continue-h" className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Continue learning</h3>
          <HomeStudyBar />
          <TodayStudyCard />
          <Link to="/classroom" data-tour="home-classroom" className="mt-3 flex min-h-[88px] items-center gap-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 transition hover:border-violet-500/50">
            <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-violet-500/20 text-violet-400"><FontAwesomeIcon icon={faChalkboard} className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-semibold">AI Classroom {isNew("feature:classroom") && <NewBadge />}</span>
              <span className="block text-sm text-muted">Learn any topic from your own notes with a voice-guided AI tutor.</span>
            </span>
            <span aria-hidden="true" className="text-violet-400">→</span>
          </Link>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-8 lg:col-span-2">

            {/* Explore */}
            <section aria-labelledby="explore-h">
              <h3 id="explore-h" className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Everything in UniLib</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {EXPLORE.map((it) => (
                  <Link key={it.href + it.title} to={it.href} className="flex min-h-[96px] flex-col gap-2 rounded-2xl border border-line bg-surface p-4 transition hover:border-violet-500/40">
                    <FontAwesomeIcon icon={it.icon} className="h-5 w-5 text-violet-400" aria-hidden="true" />
                    <span className="text-sm font-semibold">{it.title}</span>
                    <span className="text-xs leading-snug text-muted">{it.hint}</span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Recent activity */}
            <section aria-labelledby="activity-h">
              <div className="mb-3 flex items-center justify-between">
                <h3 id="activity-h" className="text-xs font-semibold uppercase tracking-widest text-muted">Recent activity</h3>
                <div className="flex gap-1" role="group" aria-label="Activity period">
                  {[3, 7, 30].map((d) => (
                    <button key={d} onClick={() => setActivityDays(d)} aria-pressed={activityDays === d}
                      className={`min-h-9 rounded-full px-3 text-xs transition ${activityDays === d ? "border border-violet-500/30 bg-violet-500/20 text-violet-400" : "text-muted hover:text-ink"}`}>{d} days</button>
                  ))}
                </div>
              </div>
              {activityLoading ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
                : activityError ? <LoadError what="your activity" onRetry={() => setReloadKey((k) => k + 1)} />
                : recentActivity.length === 0 ? <p className="rounded-xl border border-dashed border-line py-6 text-center text-sm text-muted">Nothing here yet. Upload a note or ask the AI a question and it will show up.</p>
                : recentActivity.map((item) => (
                  <Link key={item.id} to={item.href || "/home"} className="mb-2 flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition hover:border-violet-500/30">
                    <span className="mt-0.5 text-violet-400" aria-hidden="true">{activityIcon(item.type)}</span>
                    <div>
                      <p className="text-sm">{item.description}</p>
                      <p className="mt-0.5 text-xs text-muted">{timeAgo(item.createdAt)}</p>
                    </div>
                  </Link>
                ))}
            </section>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            <section aria-labelledby="progress-h" className="rounded-2xl border border-line bg-surface p-4">
              <h3 id="progress-h" className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Your progress</h3>
              {loading ? <div className="h-16 animate-pulse rounded-xl bg-ink/10" />
                : (
                <dl className="grid grid-cols-2 gap-3">
                  <div><dt className="text-xs text-muted">Day streak</dt><dd className="text-2xl font-bold text-violet-400">{streak}</dd></div>
                  {statsError || !stats ? (
                    <div className="col-span-2"><LoadError what="your stats" onRetry={() => setReloadKey((k) => k + 1)} /></div>
                  ) : (
                    <>
                      <div><dt className="text-xs text-muted">Files uploaded</dt><dd className="text-2xl font-bold">{stats.files}</dd></div>
                      <div><dt className="text-xs text-muted">Listings</dt><dd className="text-2xl font-bold">{stats.products}</dd></div>
                      <div><dt className="text-xs text-muted">Messages sent</dt><dd className="text-2xl font-bold">{stats.messages}</dd></div>
                    </>
                  )}
                </dl>
              )}
            </section>
            <StudyTimer />
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-ink/5 px-4 py-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-lg font-black tracking-tight">UNI<span className="text-violet-400">LIB</span></h2>
            <p className="text-sm text-ink/30 max-w-80">A smart educational platform designed to help students store, organise, and interact with learning materials.</p>
          </div>
          <div className="lg:col-span-3 grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-xs text-muted uppercase tracking-widest mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-ink/50">
                <li><Link to="/study-material" className="hover:text-violet-400 transition">Library</Link></li>
                <li><Link to="/ai" className="hover:text-violet-400 transition">AI</Link></li>
                <li><Link to="/marketplace" className="hover:text-violet-400 transition">Marketplace</Link></li>
                <li><Link to="/chat" className="hover:text-violet-400 transition">Chat</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-xs text-ink/30 uppercase tracking-widest mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-ink/50">
                                <li><Link to="/terms" className="hover:text-violet-400 transition">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-violet-400 transition">Privacy Policy</Link></li>
                <li><Link to="/feedback" className="hover:text-violet-400 transition">Contact &amp; feedback</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-4 border-t border-ink/5 flex justify-between items-center">
          <p className="text-muted text-sm">© 2026 UNILIB</p>
          <p className="text-sm text-muted">All rights reserved.</p>
        </div>
        <h1 className="text-center font-extrabold leading-[0.7] text-transparent text-[clamp(3rem,15vw,15rem)] [-webkit-text-stroke:1px_rgba(255,255,255,0.05)] mt-6 select-none">
          UNILIB
        </h1>
      </footer>


    </div>
  );
}

export default Home;


