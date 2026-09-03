import { getAccessToken } from "./token";
import { useState, useEffect, useCallback, useMemo, createContext, useContext } from "react";
import { useAuth } from "./useAuth";
import { useNavigate } from "react-router-dom";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileLines, faLock, faVideo, faBox, faFile, faNoteSticky, faUser, faGlobe,
  faHouse, faBook, faRobot, faComments, faStore, faChevronDown, faXmark,
  faCalculator, faUpload, faGrip, faChevronRight, faFolder, faFolderOpen,
  faLayerGroup, faBookOpen, faDownload, faCheck, faTrash, faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { faFile as farFile } from '@fortawesome/free-regular-svg-icons';
import { UploadModal } from "./UploadModal";
import { createNotification } from "./notifications";
import { useOfflineDownload } from "./useOfflineDownload";
import { listDownloadedMaterials, getOfflineBlobUrl } from "./offlineStorage";
import { getUniversity } from "./universities";
import { useParams } from "react-router-dom";


// TODO: fill in your real contact details — shown on empty faculty cards.
const DEVELOPER_CONTACT = {
  whatsapp: "https://wa.me/2349056296658",
};

const LEVEL_ORDER = ["100", "200", "300", "400", "500"];
const SEMESTER_ORDER = ["first", "second"];
const SEMESTER_LABELS = { first: "First Semester", second: "Second Semester" };

function normalizeSemester(raw) {
  if (raw === 1 || raw === "1") return "first";
  if (raw === 2 || raw === "2") return "second";
  if (typeof raw === "string") return raw.toLowerCase();
  return "unspecified";
}

function normalizeLevel(raw) {
  if (raw == null) return "Unspecified";
  const num = String(raw).replace(/\D/g, "");
  return num ? `${num}L` : "Unspecified";
}

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

const formatBytes = (bytes) => {
  if (!bytes) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const TAB_LINKS = [
  { href: "/home",           label: "Home",   icon: faHouse },
  { href: "/study-material", label: "Library",  icon: faBook },
  { href: "/ai",             label: "AI",     icon: faRobot },
  { href: "/chat",           label: "Chat",   icon: faComments },
  { href: "/marketplace",    label: "Market", icon: faStore },
];

const OfflineContext = createContext({ downloadedIds: new Set() });

// Shared visual primitives so every surface in this file reads as one
// system: one accent (violet), neutral badges, soft shadow instead of
// hard borders, consistent 12–16px radii.
const CARD = "bg-bg-elevated shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.5)] rounded-2xl";
const BADGE_NEUTRAL = "px-2.5 py-1 bg-ink/[0.06] text-ink/50 rounded-full text-xs font-medium";
const BADGE_ACCENT = "px-2.5 py-1 bg-violet-500/10 text-violet-400 rounded-full text-xs font-medium";

// ─── Scientific Calculator ─────────────────────────────────────────
function Calculator({ onClose }) {
  const [display, setDisplay] = useState("0");
  const [equation, setEquation] = useState("");
  const [justCalculated, setJustCalculated] = useState(false);

  const buttons = [
    ["AC", "+/-", "%", "÷"], ["7","8","9","×"], ["4","5","6","−"], ["1","2","3","+"],
    ["sin","cos","tan","√"], ["π","^","log","ln"], ["(",")",".","="], ["0"],
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
      <div className={`${CARD} w-80 overflow-hidden`}>
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <span className="text-ink font-semibold text-sm">Calculator</span>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-ink/30 hover:text-ink hover:bg-ink/[0.06] transition">
            <FontAwesomeIcon icon={faXmark} className="text-xs" />
          </button>
        </div>
        <div className="px-6 pb-3 text-right">
          <p className="text-ink/25 text-xs h-4 truncate">{equation}</p>
          <p className="text-ink text-4xl font-light truncate">{display}</p>
        </div>
        <div className="grid grid-cols-4 gap-1.5 p-4 pt-1">
          {buttons.flat().map((btn, i) => (
            <button key={i} onClick={() => handleButton(btn)}
              className={`rounded-xl py-3 text-sm font-medium transition active:scale-95 ${
                btn === "=" ? "bg-violet-500 hover:bg-violet-400 text-white" :
                btn === "0" ? "bg-ink/[0.04] text-ink col-span-4 text-left pl-6" :
                isOperator(btn) ? "bg-violet-500/10 text-violet-400" :
                ["sin","cos","tan","√","π","^","log","ln","(",")"].includes(btn) ? "bg-ink/[0.04] text-ink/40 text-xs" :
                "bg-ink/[0.04] text-ink"
              }`}>{btn}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AskAIButton({ fileUrl, fileName, onClose }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAskAI() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error("Could not fetch file");
      const blob = await res.blob();
      const file = new File([blob], (fileName || "material") + ".pdf", { type: "application/pdf" });
      onClose();
      navigate("/ai", { state: { preloadedFile: file } });
    } catch (err) {
      console.error(err);
      setError("Could not load PDF. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-3">
      {error && <p className="text-pink-400 text-xs mb-1">{error}</p>}
      <button
        onClick={handleAskAI}
        disabled={loading}
        className="w-full py-2.5 border border-violet-500/30 text-violet-400 rounded-xl text-sm font-medium hover:bg-violet-500/10 disabled:opacity-40 transition flex items-center justify-center gap-2"
      >
        <FontAwesomeIcon icon={faRobot} />
        {loading ? "Loading PDF…" : "Ask AI about this"}
      </button>
    </div>
  );
}

// ─── File Detail Modal ─────────────────────────────────────────────
function FileDetailModal({ file, user, onClose, onUpdated, onDownloadChange }) {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState({
  title: file.title || "",
  faculty: file.faculty || "",
  department: file.department || "",
  level: file.level || "",
  semester: file.semester || "",
  description: file.description || "",
  course: file.course || "",
});

  const [resolvedUrl, setResolvedUrl] = useState(file.signedUrl || null);
  const [resolvingUrl, setResolvingUrl] = useState(!file.signedUrl);

  const { downloaded, downloading, progress, error: downloadError, download, remove } = useOfflineDownload(file);

  useEffect(() => {
    let createdBlobUrl = null;
    let cancelled = false;

    (async () => {
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      if (file.signedUrl && !offline) {
        setResolvedUrl(file.signedUrl);
        setResolvingUrl(false);
        return;
      }
      setResolvingUrl(true);
      const blobUrl = await getOfflineBlobUrl(file.id);
      if (cancelled) return;
      if (blobUrl) {
        createdBlobUrl = blobUrl;
        setResolvedUrl(blobUrl);
      } else if (file.signedUrl) {
    
        setResolvedUrl(file.signedUrl);
      }
      setResolvingUrl(false);
    })();

    return () => {
      cancelled = true;
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
    };
  }, [file.id, file.signedUrl]);

  if (!file) return null;

  const isOwner = file.user?.displayName === user?.displayName;

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const token = getAccessToken();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/study-material/${file.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) throw new Error("Failed to save");
      setEditMode(false);
      onUpdated(); // refresh the file list
    } catch (err) {
      console.error(err);
      setSaveError("Could not save changes. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadClick = async () => {
    await download();
    onDownloadChange?.();
  };

  const handleRemoveClick = async () => {
    await remove();
    onDownloadChange?.();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-bg-elevated border border-ink/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/5">
          <h2 className="font-bold text-ink truncate pr-4">
            {editMode ? "Edit File Info" : file.title}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {isOwner && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="px-3 py-1.5 text-xs font-medium bg-white/5 border border-ink/10 text-ink/50 hover:text-violet-400 hover:border-violet-500/40 rounded-xl transition"
              >
                Edit
              </button>
            )}
            {editMode && (
              <button
                onClick={() => { setEditMode(false); setSaveError(""); }}
                className="px-3 py-1.5 text-xs font-medium bg-white/5 border border-ink/10 text-ink/50 hover:text-ink/80 rounded-xl transition"
              >
                Cancel
              </button>
            )}
            <button onClick={onClose} className="text-ink/30 hover:text-ink transition">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>

        <div className="p-6">

          {/* ── VIEW MODE ── */}
          {!editMode && (
            <>
              <div className="text-center mb-5">
                <p className="text-5xl text-violet-400 mb-2">{FILE_ICONS[getMimeFileType(file.fileType)]}</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {file.course && <span className="px-3 py-1 bg-violet-500/15 text-violet-400 border border-violet-500/20 rounded-full text-xs">{file.course}</span>}
                  {file.faculty && <span className="px-3 py-1 bg-violet-500/15 text-violet-400 border border-violet-500/20 rounded-full text-xs">{file.faculty}</span>}
                  {file.level && <span className="px-3 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-full text-xs">{file.level}L</span>}
                  {file.semester && <span className="px-3 py-1 bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded-full text-xs">{SEMESTER_LABELS[file.semester] || file.semester}</span>}
                  {file.university?.name && <span className="px-3 py-1 bg-white/5 text-ink/50 border border-ink/10 rounded-full text-xs">{file.university.shortName || file.university.name}</span>}
                  {downloaded && (
                    <span className="px-3 py-1 bg-sky-500/15 text-sky-400 border border-sky-500/20 rounded-full text-xs">
                      <FontAwesomeIcon icon={faCheck} className="mr-1" />Downloaded
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2 mb-5 text-sm text-ink/50">
                {file.department && <p className="text-ink/40"><span className="text-ink/20 mr-1">Dept:</span>{file.department}</p>}
                {file.description && <p className="text-ink/40">{file.description}</p>}
                {file.createdAt && <p><FontAwesomeIcon icon={faFile} className="mr-1" /> Uploaded: {formatDate(file.createdAt)}</p>}
                {file.user?.displayName && <p><FontAwesomeIcon icon={faUser} className="mr-1" /> By: {file.user?.displayName}</p>}
                {file.isPublic != null && (
                  <p>{file.isPublic ? <><FontAwesomeIcon icon={faGlobe} className="mr-1" />Public</> : <><FontAwesomeIcon icon={faLock} className="mr-1" />Private</>}</p>
                )}
                {file.fileSize && <p><FontAwesomeIcon icon={faBox} className="mr-1" /> Size: {formatBytes(file.fileSize)}</p>}
              </div>

              {resolvingUrl && (
                <div className="mb-4 py-8 text-center text-ink/30 text-sm">Loading file…</div>
              )}

              {!resolvingUrl && resolvedUrl && getMimeFileType(file.fileType) === "pdf" && (
                <div className="mb-4 rounded-xl overflow-hidden border border-ink/10" style={{ height: 300 }}>
                  <iframe src={resolvedUrl} className="w-full h-full" title={file.title} />
                </div>
              )}
              {!resolvingUrl && resolvedUrl && getMimeFileType(file.fileType) === "video" && (
                <div className="mb-4 rounded-xl overflow-hidden bg-black">
                  <video controls className="w-full max-h-64" src={resolvedUrl} />
                </div>
              )}

              {!resolvingUrl && resolvedUrl && (
  <div className="flex gap-3 mb-3">
    <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-2.5 bg-violet-500 hover:bg-violet-400 text-white rounded-xl text-sm font-medium text-center transition">Open</a>
    <a href={resolvedUrl} download={file.title} className="flex-1 py-2.5 border border-violet-500/30 text-violet-400 rounded-xl text-sm font-medium text-center hover:bg-violet-500/10 transition">Download</a>
  </div>
)}

{!resolvingUrl && resolvedUrl && getMimeFileType(file.fileType) === "pdf" && (
  <AskAIButton fileUrl={resolvedUrl} fileName={file.title} onClose={onClose} />
)}

              {/* ── Offline save / remove ── */}
              {downloadError && <p className="text-pink-400 text-xs mb-2">{downloadError}</p>}

              {downloading ? (
                <div className="w-full bg-white/5 border border-ink/10 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between text-xs text-ink/40 mb-1.5">
                    <span>Saving for offline…</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : downloaded ? (
                <button
                  onClick={handleRemoveClick}
                  className="w-full py-2.5 border border-pink-500/30 text-pink-400 rounded-xl text-sm font-medium hover:bg-pink-500/10 transition flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faTrash} className="text-xs" />
                  Remove offline copy
                </button>
              ) : (
                file.signedUrl && (
                  <button
                    onClick={handleDownloadClick}
                    className="w-full py-2.5 border border-sky-500/30 text-sky-400 rounded-xl text-sm font-medium hover:bg-sky-500/10 transition flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faDownload} className="text-xs" />
                    Save for offline
                  </button>
                )
              )}
            </>
          )}

          {/* ── EDIT MODE ── */}
          {editMode && (
            <div className="space-y-3">
              {saveError && <p className="text-pink-400 text-sm">{saveError}</p>}

              <div>
                <label className="text-xs text-ink/30 mb-1 block">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-black/40 border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 transition"
                />
              </div>

               <div>
                <label className="text-xs text-ink/30 mb-1 block">Course Code</label>
                <input
                  type="text"
                  placeholder="e.g CHM 101"
                  value={form.course}
                  onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
                  className="w-full bg-black/40 border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 transition"
                />
              </div>

              <div>
                <label className="text-xs text-ink/30 mb-1 block">Faculty</label>
                <input
                  type="text"
                  placeholder="e.g ENGINEERING"
                  value={form.faculty}
                  onChange={e => setForm(f => ({ ...f, faculty: e.target.value }))}
                  className="w-full bg-black/40 border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 transition"
                />
              </div>

              <div>
                <label className="text-xs text-ink/30 mb-1 block">Department</label>
                <input
                  type="text"
                  placeholder="e.g. MINING ENGINEERING"
                  value={form.department}
                  onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                  className="w-full bg-black/40 border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 transition"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-ink/30 mb-1 block">Level</label>
                  <select
                    value={form.level}
                    onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                    className="w-full bg-black/40 border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink/70 outline-none focus:border-violet-500/60 transition"
                  >
                    <option value="">— Level —</option>
                    {["100","200","300","400","500"].map(l => (
                      <option key={l} value={l}>{l} Level</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-ink/30 mb-1 block">Semester</label>
                  <select
                    value={form.semester}
                    onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                    className="w-full bg-black/40 border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink/70 outline-none focus:border-violet-500/60 transition"
                  >
                    <option value="">— Semester —</option>
                    <option value="first">1st Semester</option>
                    <option value="second">2nd Semester</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-ink/30 mb-1 block">Description</label>
                <textarea
                  placeholder="Optional description..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-black/40 border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 resize-none transition"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-ink rounded-xl text-sm font-medium transition mt-2"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── File Row (list item inside a course) ─────────────────────────
function FileRow({ file, user, onSelect, onDelete }) {
  const fileType = getMimeFileType(file.fileType);
  const { downloadedIds } = useContext(OfflineContext);
  const isDownloaded = downloadedIds.has(file.id);

  return (
    <div
      onClick={() => onSelect(file)}
      className="flex items-center gap-3 px-4 py-3 hover:bg-violet-500/5 rounded-xl cursor-pointer group transition"
    >
      <div className="w-8 h-8 bg-violet-500/10 rounded-lg flex items-center justify-center text-violet-400 text-sm shrink-0 group-hover:bg-violet-500/20 transition">
        {FILE_ICONS[fileType]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{file.title}</p>
        <p className="text-xs text-ink/30">{formatDate(file.createdAt)} · {file.user?.displayName}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isDownloaded && (
          <span title="Downloaded for offline use" className="w-5 h-5 bg-sky-500/15 text-sky-400 rounded-full flex items-center justify-center text-[10px]">
            <FontAwesomeIcon icon={faDownload} />
          </span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          fileType === "pdf" ? "bg-red-500/10 text-red-400" :
          fileType === "video" ? "bg-blue-500/10 text-blue-400" :
          "bg-white/5 text-ink/40"
        }`}>
          {fileType === "pdf" ? "PDF" : fileType === "video" ? "Video" : "Note"}
        </span>
        {file.user?.displayName === user?.displayName && (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (!window.confirm("Delete this file?")) return;
              try {
                const token = getAccessToken();
                await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/study-material/${file.id}`, {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                });
                onDelete();
              } catch (err) { console.error(err); }
            }}
            className="w-6 h-6 bg-pink-500/15 text-pink-400 rounded-full flex items-center justify-center hover:bg-pink-500/25 transition opacity-0 group-hover:opacity-100"
          >
            <FontAwesomeIcon icon={faXmark} className="text-xs" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Course Section (collapsible) ─────────────────────────────────
function CourseSection({ courseName, files, user, onSelect, onDelete }) {
  const [open, setOpen] = useState(false);
  const sorted = [...files];

  return (
  <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-violet-500/5 hover:-translate-y-0.5 transition-all duration-200">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-violet-500/5 transition text-left group"
      >
        <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center justify-center shrink-0 group-hover:border-emerald-500/40 transition-colors">
          <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-400 leading-none">
            {courseName}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-ink truncate leading-tight">
            {courseName}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[11px] font-mono text-emerald-400/70">{files.length}</span>
            <span className="text-xs text-ink/30">
              {files.length === 1 ? "file" : "files"}
            </span>
          </div>
        </div>

        <FontAwesomeIcon
          icon={faChevronDown}
          className={`text-ink/20 text-xs transition-transform duration-200 ${open ? "rotate-180 text-violet-400/60" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-white/[0.05] bg-white/[0.01] py-1">
          {sorted.map(file => (
            <FileRow key={file.id} file={file} user={user} onSelect={onSelect} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
function DepartmentBlock({ deptName, programmes, user, onSelect, onDelete, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);

  const sortedProgrammes = Object.keys(programmes).sort();
  const totalFiles = Object.values(programmes).reduce(
    (a, coursesObj) => a + Object.values(coursesObj).reduce((b, arr) => b + arr.length, 0), 0
  );

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 py-2.5 group w-full text-left"
      >
        <FontAwesomeIcon
          icon={faChevronRight}
          className={`text-ink/20 text-xs transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="text-xs font-bold text-ink/60 uppercase tracking-wider truncate">{deptName}</span>
        <span className="text-xs text-ink/25 ml-auto shrink-0">
          {sortedProgrammes.length} {sortedProgrammes.length === 1 ? "programme" : "programmes"} · {totalFiles} files
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-1 mt-1 mb-3 pl-5">
          {sortedProgrammes.map(prog => (
            <ProgrammeBlock
              key={prog}
              programmeName={prog}
              courses={programmes[prog]}
              user={user}
              onSelect={onSelect}
              onDelete={onDelete}
              defaultOpen={sortedProgrammes.length === 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
function ProgrammeBlock({ programmeName, courses, user, onSelect, onDelete, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);

  // Programme → Level → Semester → Course
  const byLevel = useMemo(() => {
    const l = {};
    Object.entries(courses).forEach(([courseName, files]) => {
      const level = normalizeLevel(files[0]?.courseRef?.level);
      const sem   = normalizeSemester(files[0]?.courseRef?.semester);
      if (!l[level]) l[level] = {};
      if (!l[level][sem]) l[level][sem] = {};
      l[level][sem][courseName] = files;
    });
    return l;
  }, [courses]);

 const sortedLevels = Object.keys(byLevel).sort(
  (a, b) => LEVEL_ORDER.indexOf(a.replace("L", "")) - LEVEL_ORDER.indexOf(b.replace("L", ""))
);
  const totalFiles = Object.values(courses).reduce((a, arr) => a + arr.length, 0);

  return (
    <div className="pl-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 py-2 group w-full text-left"
      >
        <FontAwesomeIcon
          icon={faChevronRight}
          className={`text-ink/15 text-[10px] transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="text-xs font-semibold text-ink/50 truncate">{programmeName}</span>
        <span className="text-[11px] text-ink/25 ml-auto shrink-0">
          {Object.keys(courses).length} {Object.keys(courses).length === 1 ? "course" : "courses"} · {totalFiles} files
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 mt-1 mb-2 pl-4">
          {sortedLevels.map(level => (
            <LevelBlock
              key={level}
              levelLabel={level}
              semesters={byLevel[level]}
              user={user}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Level Block (inside Department — 100L/200L/etc, contains courses) ───
function LevelBlock({ levelLabel, semesters = {}, user, onSelect, onDelete }) {
  const [open, setOpen] = useState(false);
  const sortedSemesters = Object.keys(semesters).sort(
  (a, b) => SEMESTER_ORDER.indexOf(a) - SEMESTER_ORDER.indexOf(b)
);
  const totalFiles = Object.values(semesters).reduce(
    (a, courseObj) => a + Object.values(courseObj).reduce((b, arr) => b + arr.length, 0), 0
  );

  return (
    <div className="pl-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 py-2 group w-full text-left"
      >
        <FontAwesomeIcon
          icon={faChevronRight}
          className={`text-ink/15 text-[10px] transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="text-xs font-semibold text-ink/50">{levelLabel}</span>
        <span className="text-[11px] text-ink/25 ml-auto shrink-0">{totalFiles} files</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 mt-1 mb-2 pl-4">
          {sortedSemesters.length === 0 ? (
            <p className="text-xs text-ink/30 py-2 pl-1">No materials yet for this level.</p>
          ) : (
            sortedSemesters.map(sem => (
              <SemesterBlock
                key={sem}
                semesterKey={sem}
                courses={semesters[sem]}
                user={user}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}



// ─── Faculty Block (top of the tree — school/faculty) ──────────────
function FacultyBlock({
  facultyName,
  facultyFullName,
  departments,
  user,
  onSelect,
  onDelete,
  onUploadClick,
  defaultOpen,
}) {
    const [open, setOpen] = useState(false);
  const sortedDepts = Object.keys(departments).sort();
 const totalFiles = Object.values(departments).reduce(
  (a, levelObj) => a + Object.values(levelObj).reduce(
    (b, courseObj) => b + Object.values(courseObj).reduce((c, arr) => c + arr.length, 0), 0
  ), 0
);

  return (
    <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-violet-500/5 transition text-left"
      >
        <div className="w-10 h-10 bg-violet-500/15 border border-violet-500/25 rounded-2xl flex items-center justify-center shrink-0">
          <FontAwesomeIcon icon={faBookOpen} className="text-violet-400 text-sm" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-ink truncate">{facultyName}</p>
          {facultyFullName && facultyFullName !== facultyName && (
            <p className="text-xs text-ink/30 truncate">{facultyFullName}</p>
          )}
            <p className="text-xs text-ink/20">
  {sortedDepts.length} {sortedDepts.length === 1 ? "department" : "departments"}
</p>        </div>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`text-ink/30 text-sm transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-5 pt-1 flex flex-col gap-1">
         {sortedDepts.map((dept, i) => (
  <DepartmentBlock
    key={dept}
    deptName={dept}
    programmes={departments[dept]}
    user={user}
    onSelect={onSelect}
    onDelete={onDelete}
    defaultOpen={defaultOpen && i === 0}
  />
))}
        </div>
      )}
    </div>
  );
}

// ─── Flat Grid Card (for search results) ─────────────────────────
function FileCard({ file, user, onSelect, onDelete }) {
  const { downloadedIds } = useContext(OfflineContext);
  const isDownloaded = downloadedIds.has(file.id);

  return (
    <div onClick={() => onSelect(file)} className="bg-white/[0.03] border border-ink/10 rounded-2xl p-4 hover:border-violet-500/30 hover:bg-violet-500/5 transition cursor-pointer group relative">
      {file.user?.displayName === user?.displayName && (
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (!window.confirm("Delete this file?")) return;
            try {
              const token = getAccessToken();
              await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/study-material/${file.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              onDelete();
            } catch (err) { console.error(err); }
          }}
          className="absolute top-2 right-2 w-7 h-7 bg-pink-500/15 text-pink-400 rounded-full flex items-center justify-center hover:bg-pink-500/25 transition opacity-0 group-hover:opacity-100"
        >
          <FontAwesomeIcon icon={faXmark} className="text-xs" />
        </button>
      )}
      {isDownloaded && (
        <span title="Downloaded for offline use" className="absolute top-2 left-2 w-6 h-6 bg-sky-500/15 text-sky-400 rounded-full flex items-center justify-center text-[10px]">
          <FontAwesomeIcon icon={faDownload} />
        </span>
      )}
      <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center text-2xl text-violet-400 mb-3 group-hover:bg-violet-500/20 transition">
        {FILE_ICONS[getMimeFileType(file.fileType)]}
      </div>
      <p className="text-sm font-semibold text-ink truncate mb-1">{file.title}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {file.faculty && <span className="px-2 py-0.5 bg-violet-500/15 text-violet-400 rounded-full text-xs">{file.faculty}</span>}
        {file.level && <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-full text-xs">{file.level}L</span>}
        {file.university?.shortName && <span className="px-2 py-0.5 bg-white/5 text-ink/40 rounded-full text-xs">{file.university.shortName}</span>}
      </div>
      <p className="text-xs text-ink/30">{formatDate(file.createdAt)}</p>
    </div>
  );
}

function UniversityCard({ uni }) {
  return (
    <Link
      to={`/schools/${uni.slug}`}
      className={`${CARD} p-6 flex items-center gap-4 hover:-translate-y-0.5 transition group`}
    >
      <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-violet-500/15 transition">
        <FontAwesomeIcon icon={faBookOpen} className="text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink truncate">{uni.shortName || uni.name}</p>
        {uni.shortName && uni.name !== uni.shortName && (
          <p className="text-xs text-ink/35 truncate mt-0.5">{uni.name}</p>
        )}
      </div>
      <FontAwesomeIcon icon={faChevronRight} className="text-ink/20 text-xs shrink-0" />
    </Link>
  );
}

function UniversityPicker({ universities }) {
  return (
    <div>
      <p className="text-sm font-bold text-ink/70 mb-1">Choose your university</p>
      <p className="text-xs text-ink/35 mb-5">
        Pick a university to browse its schools, departments and course materials.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {universities.map(uni => <UniversityCard key={uni.id} uni={uni} />)}
      </div>
      {universities.length === 0 && (
        <p className="text-ink/30 text-sm">No universities available yet.</p>
      )}
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
  const [levelFilter, setLevelFilter] = useState("All");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [viewMode, setViewMode] = useState("hierarchy"); // "hierarchy" | "grid"
  const [showUpload, setShowUpload] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [universitiesList, setUniversitiesList] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const universitySlugParam = searchParams.get("university");

 // ── Offline state ──
const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
const [downloadedIds, setDownloadedIds] = useState(new Set());
const [showDownloadedOnly, setShowDownloadedOnly] = useState(false);
const [usingOfflineFallback, setUsingOfflineFallback] = useState(false);

const refreshDownloads = useCallback(async () => {
  const meta = await listDownloadedMaterials();
  setDownloadedIds(new Set(meta.map((m) => m.id)));
}, []);

// eslint-disable-next-line react-hooks/set-state-in-effect -- false positive, `refreshDownloads` is
// already async; see https://github.com/react/react/issues/34743
useEffect(() => { refreshDownloads(); }, [refreshDownloads]);

useEffect(() => {
  const goOnline = () => setIsOnline(true);
  const goOffline = () => setIsOnline(false);
  window.addEventListener("online", goOnline);
  window.addEventListener("offline", goOffline);
  return () => {
    window.removeEventListener("online", goOnline);
    window.removeEventListener("offline", goOffline);
  };
}, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!user) return;
    const fetchFiles = async () => {
      setLoading(true);

      if (!isOnline) {
        const offlineFiles = await listDownloadedMaterials();
        setFiles(offlineFiles);
        setUsingOfflineFallback(true);
        setLoading(false);
        return;
      }

      try {
        const token = getAccessToken();
        const params = new URLSearchParams({ search: debouncedSearch });
if (universitySlugParam) params.set("university", universitySlugParam);
const res = await fetch(
  `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/study-material?${params}`,
  { headers: { Authorization: `Bearer ${token}` } }
);
        if (!res.ok) throw new Error("Request failed");
        const data = await res.json();
        setFiles(Array.isArray(data) ? data : []);
        setUsingOfflineFallback(false);
      } catch (err) {
        console.error(err);
        // Network error even though navigator.onLine said we're online (e.g.
        // server down, flaky connection) — fall back to whatever's cached.
        const offlineFiles = await listDownloadedMaterials();
        setFiles(offlineFiles);
        setUsingOfflineFallback(true);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, [user, debouncedSearch, refreshKey, isOnline, universitySlugParam]);

  useEffect(() => {
    const load = async () => {
      try {
        const token = getAccessToken();
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/universities`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUniversitiesList(await res.json());
      } catch (err) { console.error(err); }
    };
    load();
  }, []);

  // Default Level/Semester filters to the user's own, once, on first load —
  // gets them straight to their own materials with zero taps.
  useEffect(() => {
    if (!user) return;
    if (user.level && LEVEL_ORDER.includes(String(user.level))) {
      setLevelFilter(String(user.level));
    }
    if (user.semester && SEMESTER_ORDER.includes(user.semester)) {
      setSemesterFilter(user.semester);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // If we arrived here from a university's welcome page (?university=slug),
// pre-select that university's chip once the universities list has loaded.
useEffect(() => {
  if (!universitySlugParam || universitiesList.length === 0) return;
  const match = universitiesList.find(u => u.slug === universitySlugParam);
  if (match) setUniversityFilter(match.shortName || match.name);
}, [universitySlugParam, universitiesList]);

  const handleDownloadChange = useCallback(() => {
    refreshDownloads();
  }, [refreshDownloads]);

  // Filter by university / level / semester / downloaded-only
  const filtered = useMemo(() => files.filter(f => {
    if (universityFilter !== "All") {
      const matchesUni = f.university?.shortName === universityFilter || f.university?.name === universityFilter;
      if (!matchesUni) return false;
    }
    if (levelFilter !== "All" && String(f.level) !== levelFilter) return false;
    if (semesterFilter !== "All" && f.semester !== semesterFilter) return false;
    if (showDownloadedOnly && !downloadedIds.has(f.id)) return false;
    return true;
  }), [files, universityFilter, levelFilter, semesterFilter, showDownloadedOnly, downloadedIds]);

  // ── Build hierarchy: Faculty → Department → Course → Files ──
  // (Level and Semester are handled as filters above, not folder depth —
  // keeps the tree shallow so users reach a course in 2 taps instead of 4.)
 const grouped = useMemo(() => {
  const g = {};
  filtered.forEach(file => {
    // Real chain: courseRef -> program -> department -> school.
    // (Program.schoolId was dropped in Phase 3 — school now only
    // reachable via department.) Materials with no courseRef (legacy,
    // pre-migration, or needsReview) are excluded from the browse tree
    // entirely — surfacing their raw `faculty` string as a fake school
    // (e.g. "SEET") is misleading. They're still visible in the admin
    // NeedsReviewPanel.
    const school = file.courseRef?.program?.department?.school?.name;
    if (!school) return; // skip legacy/needsReview materials

    const department = file.courseRef?.program?.department?.name || "Uncategorized Department";
    const programme  = file.courseRef?.program?.name              || "Uncategorized Programme";
    const course      = file.courseRef?.code                      || "Uncategorized Course";

    if (!g[school]) g[school] = {};
    if (!g[school][department]) g[school][department] = {};
    if (!g[school][department][programme]) g[school][department][programme] = {};
    if (!g[school][department][programme][course]) g[school][department][programme][course] = [];
    g[school][department][programme][course].push(file);
  });
  return g;
}, [filtered]);

  const pendingReviewCount = useMemo(
    () => filtered.filter(f => !f.courseRef?.program?.department?.school?.name).length,
    [filtered]
  );

  const sortedFaculties = Object.keys(grouped).sort();
  const isSearching = debouncedSearch.trim().length > 0;
  const hasActiveFilters = universityFilter !== "All" || levelFilter !== "All" || semesterFilter !== "All";

  // When a specific university is selected, show its FULL faculty roster
  // (from universities.js) — including faculties with zero files, which
  // render as a quiet empty-state card instead of being hidden entirely.
  // With "All" universities selected we fall back to only showing
  // faculties that actually have matching files (enumerating every
  // faculty across every university would be overwhelming).

const rosterFaculties = useMemo(
  () => sortedFaculties.map(fac => ({ name: fac, fullName: null, departments: grouped[fac] })),
  [grouped, sortedFaculties]
);

  // Auto-expand the user's own faculty (matched against the roster) so
  // it's visible without any clicks; falls back to nothing pre-expanded.
  const myFacultyIndex = useMemo(() => {
    if (!user?.faculty) return -1;
    return rosterFaculties.findIndex(f => f.name.toLowerCase() === String(user.faculty).toLowerCase());
  }, [rosterFaculties, user?.faculty]);

  return (
    <OfflineContext.Provider value={{ downloadedIds }}>
    <div className="min-h-screen bg-bg text-ink">

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-full text-sm shadow-lg shadow-emerald-500/20">
          {successMessage}
        </div>
      )}

      {/* HEADER */}
      <header className="fixed top-0 left-0 w-full z-40 bg-bg/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Link to="/home" className="w-8 h-8 rounded-full flex items-center justify-center text-ink/40 hover:text-violet-400 hover:bg-ink/[0.05] transition">
                <FontAwesomeIcon icon={faChevronDown} className="rotate-90 text-xs" />
              </Link>
              <h1 className="text-lg font-black tracking-tight">
                UNI<span className="text-violet-400">LIB</span>
                <span className="ml-2.5 text-[11px] font-semibold bg-violet-500/10 text-violet-400 px-2.5 py-1 rounded-full align-middle">Library</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDownloadedOnly(d => !d)}
                className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition ${
                  showDownloadedOnly
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-ink/[0.05] text-ink/40 hover:text-emerald-400"
                }`}
                title="Show downloaded files only"
              >
                <FontAwesomeIcon icon={faDownload} className="text-sm" />
                {downloadedIds.size > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-emerald-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                    {downloadedIds.size}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowCalculator(true)}
                className="w-9 h-9 bg-ink/[0.05] rounded-xl flex items-center justify-center text-ink/40 hover:text-violet-400 transition"
                title="Calculator"
              >
                <FontAwesomeIcon icon={faCalculator} className="text-sm" />
              </button>
              <button
                onClick={() => setViewMode(v => v === "hierarchy" ? "grid" : "hierarchy")}
                className="w-9 h-9 bg-ink/[0.05] rounded-xl flex items-center justify-center text-ink/40 hover:text-violet-400 transition"
                title={viewMode === "hierarchy" ? "Grid view" : "Hierarchy view"}
              >
                <FontAwesomeIcon icon={viewMode === "hierarchy" ? faGrip : faLayerGroup} className="text-sm" />
              </button>
              <button
                onClick={() => setShowUpload(true)}
                disabled={!isOnline}
                className="flex items-center gap-2 bg-violet-500 hover:bg-violet-400 disabled:opacity-30 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
              >
                <FontAwesomeIcon icon={faUpload} className="text-xs" />
                Upload
              </button>
            </div>
          </div>

          {/* Nav tabs */}
          <div className="flex items-center justify-around px-2">
            {TAB_LINKS.map((tab) => {
              const isActive = location.pathname === tab.href;
              return (
                <Link key={tab.href} to={tab.href}
                  className={`flex flex-col items-center py-3 px-4 border-b-2 transition text-xs gap-1 font-medium ${
                    isActive ? "border-violet-500 text-violet-400" : "border-transparent text-ink/30 hover:text-ink/55"
                  }`}>
                  <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-32 px-6 pb-14 max-w-6xl mx-auto">

        {/* Offline / fallback banner */}
        {(!isOnline || usingOfflineFallback) && (
          <div className="flex items-center gap-2.5 bg-amber-500/10 text-amber-400 rounded-xl px-4 py-3 mb-5 text-sm">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-xs shrink-0" />
            <span>
              {!isOnline ? "You're offline — showing your downloaded files." : "Couldn't reach the server — showing downloaded files."}
            </span>
          </div>
        )}

        {!universitySlugParam ? (
          <UniversityPicker universities={universitiesList} />
        ) : (
          <>
            {/* Search Bar */}
            <div className="flex items-center gap-3 bg-bg-elevated shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-12px_rgba(0,0,0,0.5)] rounded-2xl px-5 py-3.5 mt-2 mb-5 focus-within:ring-2 focus-within:ring-violet-500/30 transition">
              <svg className="w-4 h-4 text-ink/30 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search by title, course code or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none text-ink placeholder-ink/25"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-ink/30 hover:text-ink/60 transition">
                  <FontAwesomeIcon icon={faXmark} className="text-xs" />
                </button>
              )}
            </div>

            {/* Filter chips: University, Level, Semester — set once, whole tree below narrows instantly.
                Single accent (violet) marks the active chip in every row, so "active" reads the same
                language everywhere instead of a different color per filter type. */}
            <div className="flex gap-2 overflow-x-auto pb-1 mb-2 scrollbar-hide">
              {["All", ...universitiesList.map(u => u.shortName || u.name)].map(u => (
                <button key={u} onClick={() => setUniversityFilter(u)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                    universityFilter === u
                      ? "bg-violet-500 text-white"
                      : "bg-ink/[0.05] text-ink/45 hover:text-violet-400"
                  }`}>
                  {u}
                </button>
              ))}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 mb-2 scrollbar-hide">
              {["All", ...LEVEL_ORDER].map(l => (
                <button key={l} onClick={() => setLevelFilter(l)}
                  className={`px-3.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                    levelFilter === l
                      ? "bg-violet-500 text-white"
                      : "bg-ink/[0.05] text-ink/40 hover:text-violet-400"
                  }`}>
                  {l === "All" ? "All Levels" : `${l}L`}
                </button>
              ))}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide">
              {["All", ...SEMESTER_ORDER].map(s => (
                <button key={s} onClick={() => setSemesterFilter(s)}
                  className={`px-3.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                    semesterFilter === s
                      ? "bg-violet-500 text-white"
                      : "bg-ink/[0.05] text-ink/40 hover:text-violet-400"
                  }`}>
                  {s === "All" ? "All Semesters" : SEMESTER_LABELS[s]}
                </button>
              ))}
            </div>

            {/* Stats bar */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs text-ink/35">
                {filtered.length} {filtered.length === 1 ? "file" : "files"}
                {isSearching ? ` matching "${debouncedSearch}"` : ""}
                {hasActiveFilters ? " · filtered" : ""}
                {showDownloadedOnly ? " · downloaded only" : ""}
              </p>
              {!isSearching && (
                <p className="text-xs text-ink/25">{rosterFaculties.length} {rosterFaculties.length === 1 ? "school" : "schools"}</p>
              )}
            </div>

            {/* Loading Skeleton */}
            {loading && (
              <div className="flex flex-col gap-4">
                {[1,2,3].map(i => (
                  <div key={i} className={`${CARD} p-5 shadow-none animate-pulse`}>
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 bg-ink/[0.06] rounded-2xl" />
                      <div className="flex-1">
                        <div className="h-3 bg-ink/[0.06] rounded w-1/3 mb-2.5" />
                        <div className="h-2 bg-ink/[0.06] rounded w-1/5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && filtered.length === 0 && (
              <div className="text-center py-24">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-ink/[0.04] flex items-center justify-center">
                  <FontAwesomeIcon icon={faFile} className="text-2xl text-ink/15" />
                </div>
                <p className="text-ink/50 font-medium">
                  {showDownloadedOnly ? "No downloaded files yet" : "No files found"}
                </p>
                <p className="text-ink/25 text-sm mt-1.5">
                  {showDownloadedOnly
                    ? "Open a file and tap \"Save for offline\" to keep it here."
                    : search ? "Try a different search term" : hasActiveFilters ? "Try clearing a filter above" : "Upload your first file to get started"}
                </p>
                {!showDownloadedOnly && isOnline && (
                  <button
                    onClick={() => setShowUpload(true)}
                    className="mt-5 px-6 py-2.5 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-sm font-medium transition"
                  >
                    Upload file
                  </button>
                )}
              </div>
            )}

            {/* ── HIERARCHY VIEW (default) — School → Department → Programme → Course ──
                Only schools that actually have matching files are shown; empty
                schools with zero materials don't render (see note on the roster
                fallback removal in the grouping logic). */}
            {!loading && filtered.length > 0 && (viewMode === "hierarchy" || !isSearching) && viewMode !== "grid" && (
              <div className="flex flex-col gap-4">
                {rosterFaculties.map((f, i) => (
                  <FacultyBlock
                    key={f.name}
                    facultyName={f.name}
                    facultyFullName={f.fullName}
                    departments={f.departments}
                    user={user}
                    onSelect={setSelectedFile}
                    onDelete={() => setRefreshKey(k => k + 1)}
                    onUploadClick={() => setShowUpload(true)}
                    defaultOpen={myFacultyIndex === -1 ? rosterFaculties.length === 1 : i === myFacultyIndex}
                  />
                ))}
              </div>
            )}

            {/* ── GRID VIEW (when toggled or searching) ── */}
            {!loading && filtered.length > 0 && (viewMode === "grid" || isSearching) && (
              <>
                {isSearching && viewMode !== "grid" && (
                  <p className="text-xs text-ink/30 mb-4">Showing flat results for search. Switch to grid or clear search to return to hierarchy.</p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filtered.map(file => (
                    <FileCard
                      key={file.id}
                      file={file}
                      user={user}
                      onSelect={setSelectedFile}
                      onDelete={() => setRefreshKey(k => k + 1)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {showUpload && (
  <UploadModal
    onClose={async (uploaded) => {
      setShowUpload(false);
      if (uploaded) {
        setSuccessMessage("File uploaded successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
        setRefreshKey(k => k + 1);
       await createNotification(user.id, {
  type: "material",
  message: `Your file "${uploaded.title || "File"}" was uploaded successfully.`,
});
      }
    }}    user={user}
    universitiesList={universitiesList}
  />
)}
      {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
      {selectedFile && (
        <FileDetailModal
          file={selectedFile}
          user={user}
          onClose={() => setSelectedFile(null)}
          onUpdated={() => { setRefreshKey(k => k + 1); setSelectedFile(null); }}
          onDownloadChange={handleDownloadChange}
        />
      )}
    </div>
    </OfflineContext.Provider>
  );
}

export default StudyMaterial;