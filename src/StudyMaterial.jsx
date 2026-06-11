import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileLines, faLock, faVideo, faBox, faFile, faNoteSticky, faUser, faGlobe,
  faHouse, faBook, faRobot, faComments, faStore, faChevronDown, faXmark,
  faCalculator, faUpload, faList, faGrip,
} from '@fortawesome/free-solid-svg-icons';
import { faFile as farFile } from '@fortawesome/free-regular-svg-icons';
import { UploadModal } from "./UploadModal";

const FILE_ICONS = {
  pdf: <FontAwesomeIcon icon={faFileLines} />,
  video: <FontAwesomeIcon icon={faVideo} />,
  note: <FontAwesomeIcon icon={faNoteSticky} />,
  default: <FontAwesomeIcon icon={farFile} />,
};

const getMimeFileType = (mimeType) => {
  if (!mimeType) return "default";
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("video")) return "video";
  if (mimeType.includes("word") || mimeType.includes("presentation") || mimeType.includes("text")) return "note";
  return "default";
};

const formatDate = (ts) => {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

const TAB_LINKS = [
  { href: "/home",          label: "Home",   icon: faHouse },
  { href: "/study-material",label: "Study",  icon: faBook },
  { href: "/ai",            label: "AI",     icon: faRobot },
  { href: "/chat",          label: "Chat",   icon: faComments },
  { href: "/marketplace",   label: "Market", icon: faStore },
];

// ─── Scientific Calculator ─────────────────────────────────────────
function Calculator({ onClose }) {
  const [display, setDisplay] = useState("0");
  const [equation, setEquation] = useState("");
  const [justCalculated, setJustCalculated] = useState(false);

  const buttons = [
    ["AC", "+/-", "%", "÷"],["7","8","9","×"],["4","5","6","−"],["1","2","3","+"],
    ["sin","cos","tan","√"],["π","^","log","ln"],["(",")",".","="],["0"],
  ];

  const handleButton = (val) => {
    if (val === "AC") { setDisplay("0"); setEquation(""); setJustCalculated(false); return; }
    if (val === "+/-") { setDisplay(d => String(parseFloat(d) * -1)); return; }
    if (val === "%") { setDisplay(d => String(parseFloat(d) / 100)); return; }
    if (val === "=") {
      try {
        let expr = equation + display;
        expr = expr.replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-")
          .replace(/π/g,Math.PI).replace(/sin\(/g,"Math.sin(").replace(/cos\(/g,"Math.cos(")
          .replace(/tan\(/g,"Math.tan(").replace(/√\(/g,"Math.sqrt(")
          .replace(/log\(/g,"Math.log10(").replace(/ln\(/g,"Math.log(").replace(/\^/g,"**");
        setDisplay(String(parseFloat(eval(expr).toFixed(10))));
        setEquation(""); setJustCalculated(true);
      } catch { setDisplay("Error"); }
      return;
    }
    if (["÷","×","−","+","^"].includes(val)) { setEquation(eq => eq + display + val); setDisplay("0"); setJustCalculated(false); return; }
    if (["sin","cos","tan","√","log","ln"].includes(val)) { setEquation(eq => eq + val + "("); setDisplay("0"); return; }
    if (val === "π") { setDisplay(String(Math.PI)); return; }
    if (val === "(") { setEquation(eq => eq + "("); return; }
    if (val === ")") { setEquation(eq => eq + display + ")"); setDisplay("0"); return; }
    if (val === ".") { if (!display.includes(".")) setDisplay(d => d + "."); return; }
    setDisplay(d => justCalculated ? val : d === "0" ? val : d + val);
    setJustCalculated(false);
  };

  const isOperator = (v) => ["÷","×","−","+","=","AC"].includes(v);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d0d14] border border-white/10 rounded-3xl w-80 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <span className="text-white font-semibold text-sm">Scientific Calculator</span>
          <button onClick={onClose} className="text-white/30 hover:text-white transition"><FontAwesomeIcon icon={faXmark} /></button>
        </div>
        <div className="px-5 pb-2 text-right">
          <p className="text-white/30 text-xs h-4">{equation}</p>
          <p className="text-white text-4xl font-light truncate">{display}</p>
        </div>
        <div className="grid grid-cols-4 gap-1 p-3">
          {buttons.flat().map((btn, i) => (
            <button key={i} onClick={() => handleButton(btn)}
              className={`rounded-2xl py-3 text-sm font-medium transition active:scale-95 ${
                btn === "=" ? "bg-violet-500 text-white" :
                btn === "0" ? "bg-white/5 text-white col-span-4 text-left pl-6" :
                isOperator(btn) ? "bg-violet-500/30 text-violet-300" :
                ["sin","cos","tan","√","π","^","log","ln","(",")"].includes(btn) ? "bg-white/5 text-white/60 text-xs" :
                "bg-white/5 text-white"
              }`}>{btn}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── File Detail Modal ─────────────────────────────────────────────
function FileDetailModal({ file, onClose }) {
  if (!file) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-[#0d0d14] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-bold text-white">{file.title}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white transition"><FontAwesomeIcon icon={faXmark} /></button>
        </div>
        <div className="p-6">
          <div className="text-center mb-5">
            <p className="text-5xl text-violet-400 mb-2">{FILE_ICONS[getMimeFileType(file.fileType)]}</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {file.faculty && <span className="px-3 py-1 bg-violet-500/15 text-violet-400 border border-violet-500/20 rounded-full text-xs">{file.faculty}</span>}
              {file.university?.name && <span className="px-3 py-1 bg-white/5 text-white/50 border border-white/10 rounded-full text-xs">{file.university.shortName || file.university.name}</span>}
            </div>
          </div>
          <div className="space-y-2 mb-5 text-sm text-white/50">
            {file.description && <p className="text-white/40">{file.description}</p>}
            <p><FontAwesomeIcon icon={faFile} className="mr-1" /> Uploaded: {formatDate(file.createdAt)}</p>
            <p><FontAwesomeIcon icon={faUser} className="mr-1" /> By: {file.user?.displayName}</p>
            <p>{file.isPublic ? <><FontAwesomeIcon icon={faGlobe} className="mr-1" />Public</> : <><FontAwesomeIcon icon={faLock} className="mr-1" />Private</>}</p>
            {file.fileSize && <p><FontAwesomeIcon icon={faBox} className="mr-1" /> Size: {(file.fileSize / 1024 / 1024).toFixed(2)} MB</p>}
          </div>
          {getMimeFileType(file.fileType) === "pdf" && (
            <div className="mb-4 rounded-xl overflow-hidden border border-white/10" style={{ height: 300 }}>
              <iframe src={file.signedUrl} className="w-full h-full" title={file.title} />
            </div>
          )}
          {getMimeFileType(file.fileType) === "video" && (
            <div className="mb-4 rounded-xl overflow-hidden bg-black">
              <video controls className="w-full max-h-64" src={file.signedUrl} />
            </div>
          )}
          <div className="flex gap-3">
            <a href={file.signedUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-2.5 bg-violet-500 hover:bg-violet-400 text-white rounded-xl text-sm font-medium text-center transition">Open</a>
            <a href={file.signedUrl} download className="flex-1 py-2.5 border border-violet-500/30 text-violet-400 rounded-xl text-sm font-medium text-center hover:bg-violet-500/10 transition">Download</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── File Card ─────────────────────────────────────────────────────
function FileCard({ file, user, onSelect, onDelete }) {
  return (
    <div onClick={() => onSelect(file)} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 hover:border-violet-500/30 hover:bg-violet-500/5 transition cursor-pointer group relative">
      {file.user?.displayName === user?.displayName && (
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (!window.confirm("Delete this file?")) return;
            try {
              const { auth } = await import("./firebase");
              const { getIdToken } = await import("firebase/auth");
              const token = await getIdToken(auth.currentUser, true);
              await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/study-material/${file.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
              onDelete();
            } catch (err) { console.error(err); }
          }}
          className="absolute top-2 right-2 w-7 h-7 bg-pink-500/15 text-pink-400 rounded-full flex items-center justify-center hover:bg-pink-500/25 transition opacity-0 group-hover:opacity-100"
        >
          <FontAwesomeIcon icon={faXmark} className="text-xs" />
        </button>
      )}
      <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center text-2xl text-violet-400 mb-3 group-hover:bg-violet-500/20 transition">
        {FILE_ICONS[getMimeFileType(file.fileType)]}
      </div>
      <p className="text-sm font-semibold text-white truncate mb-1">{file.title}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {file.faculty && <span className="px-2 py-0.5 bg-violet-500/15 text-violet-400 rounded-full text-xs">{file.faculty}</span>}
        {file.university?.shortName && <span className="px-2 py-0.5 bg-white/5 text-white/40 rounded-full text-xs">{file.university.shortName}</span>}
      </div>
      <p className="text-xs text-white/30">{formatDate(file.createdAt)}</p>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
function StudyMaterial() {
  const { user } = useAuth();
  const location = useLocation();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [universityFilter, setUniversityFilter] = useState("All");
  const [viewMode, setViewMode] = useState("grid");
  const [showUpload, setShowUpload] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [universitiesList, setUniversitiesList] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!user) return;
    const fetchFiles = async () => {
      try {
        const { auth } = await import("./firebase");
        const { getIdToken } = await import("firebase/auth");
        const token = await getIdToken(auth.currentUser, true);
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/study-material?search=${debouncedSearch}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setFiles(Array.isArray(data) ? data : []);
      } catch (err) { console.error(err); setFiles([]); }
      finally { setLoading(false); }
    };
    fetchFiles();
  }, [user, debouncedSearch, refreshKey]);

  useEffect(() => {
    const load = async () => {
      try {
        const { auth } = await import("./firebase");
        const { getIdToken } = await import("firebase/auth");
        const token = await getIdToken(auth.currentUser, true);
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/universities`, { headers: { Authorization: `Bearer ${token}` } });
        setUniversitiesList(await res.json());
      } catch (err) { console.error(err); }
    };
    load();
  }, []);

  const filtered = files.filter(f => {
    if (universityFilter === "All") return true;
    return f.university?.shortName === universityFilter || f.university?.name === universityFilter;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-500 rounded-full opacity-[0.06] blur-[100px]" />
      </div>

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-full text-sm shadow-lg">{successMessage}</div>
      )}

      {/* HEADER */}
      <header className="fixed top-0 left-0 w-full z-40 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-3">
              <Link to="/home" className="text-white/40 hover:text-violet-400 transition">
                <FontAwesomeIcon icon={faChevronDown} className="rotate-90" />
              </Link>
              <h1 className="text-lg font-black tracking-tight">
                TEST<span className="text-violet-400">YOURSELF</span>
                <span className="ml-2 text-xs font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full align-middle">Study</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowCalculator(true)} className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/40 hover:text-violet-400 hover:border-violet-500/40 transition" title="Calculator">
                <FontAwesomeIcon icon={faCalculator} />
              </button>
              <button onClick={() => setViewMode(v => v === "grid" ? "list" : "grid")} className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/40 hover:text-violet-400 hover:border-violet-500/40 transition">
                <FontAwesomeIcon icon={viewMode === "grid" ? faList : faGrip} />
              </button>
              <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 bg-violet-500 hover:bg-violet-400 text-white px-4 py-2 rounded-full text-sm font-medium transition">
                <FontAwesomeIcon icon={faUpload} />
                Upload
              </button>
            </div>
          </div>

          {/* Nav tabs */}
          <div className="flex items-center justify-around border-t border-white/5 px-2">
            {TAB_LINKS.map((tab) => {
              const isActive = location.pathname === tab.href;
              return (
                <Link key={tab.href} to={tab.href}
                  className={`flex flex-col items-center py-2 px-4 border-b-2 transition text-xs gap-0.5 ${isActive ? "border-violet-500 text-violet-400" : "border-transparent text-white/30 hover:text-white/60"}`}>
                  <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-28 px-4 pb-10 max-w-6xl mx-auto">

        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-full px-4 py-2.5 mt-4 mb-4 focus-within:border-violet-500/40 transition">
          <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" /></svg>
          <input type="text" placeholder="Search by title, course or keyword..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent text-sm outline-none text-white placeholder-white/20" />
          {search && <button onClick={() => setSearch("")} className="text-white/30 hover:text-white/60 transition"><FontAwesomeIcon icon={faXmark} className="text-xs" /></button>}
        </div>

        {/* University Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {["All", ...universitiesList.map(u => u.shortName || u.name)].map(u => (
            <button key={u} onClick={() => setUniversityFilter(u)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition border ${universityFilter === u ? "bg-violet-500 text-white border-violet-500" : "bg-white/[0.03] border-white/10 text-white/50 hover:border-violet-500/30 hover:text-violet-400"}`}>
              {u}
            </button>
          ))}
        </div>

        <p className="text-xs text-white/30 mb-4">{filtered.length} {filtered.length === 1 ? "file" : "files"} found</p>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 animate-pulse">
                <div className="h-12 w-12 bg-white/10 rounded-xl mb-3" />
                <div className="h-3 bg-white/10 rounded w-3/4 mb-2" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4 text-white/10"><FontAwesomeIcon icon={faFile} /></p>
            <p className="text-white/40 font-medium">No files found</p>
            <p className="text-white/20 text-sm mt-1">{search ? "Try a different search term" : "Upload your first file to get started"}</p>
            <button onClick={() => setShowUpload(true)} className="mt-4 px-6 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-sm transition">Upload File</button>
          </div>
        )}

        {/* Grid View */}
        {!loading && filtered.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(file => <FileCard key={file.id} file={file} user={user} onSelect={setSelectedFile} onDelete={() => setRefreshKey(k => k + 1)} />)}
          </div>
        )}

        {/* List View */}
        {!loading && filtered.length > 0 && viewMode === "list" && (
          <div className="flex flex-col gap-3">
            {filtered.map(file => <FileCard key={file.id} file={file} user={user} onSelect={setSelectedFile} onDelete={() => setRefreshKey(k => k + 1)} />)}
          </div>
        )}
      </main>

      {showUpload && (
        <UploadModal onClose={(uploaded) => {
          setShowUpload(false);
          if (uploaded) { setSuccessMessage("File uploaded successfully!"); setTimeout(() => setSuccessMessage(""), 3000); setRefreshKey(k => k + 1); }
        }} user={user} universitiesList={universitiesList} />
      )}
      {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
      {selectedFile && <FileDetailModal file={selectedFile} onClose={() => setSelectedFile(null)} />}
    </div>
  );
}

export default StudyMaterial;