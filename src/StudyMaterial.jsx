import { getAccessToken } from "./token";
import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { useAuth } from "./useAuth";
import { useNavigate } from "react-router-dom";
import { Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileLines, faLock, faVideo, faBox, faFile, faNoteSticky, faUser, faGlobe,
  faHouse, faBook, faRobot, faComments, faStore, faChevronDown, faXmark,
  faCalculator, faUpload, faList, faGrip, faChevronRight, faFolder, faFolderOpen,
  faLayerGroup, faBookOpen, faDownload, faCheck, faTrash, faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { faFile as farFile } from '@fortawesome/free-regular-svg-icons';
import { UploadModal } from "./UploadModal";
import { createNotification } from "./notifications";
import { useOfflineDownload } from "./useOfflineDownload";
import { listDownloadedMaterials, getOfflineBlobUrl } from "./offlineStorage";

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

const LEVEL_ORDER = ["100", "200", "300", "400", "500"];
const SEMESTER_ORDER = ["first", "second"];
const SEMESTER_LABELS = { first: "First Semester", second: "Second Semester" };

const TAB_LINKS = [
  { href: "/home",           label: "Home",   icon: faHouse },
  { href: "/study-material", label: "Study",  icon: faBook },
  { href: "/ai",             label: "AI",     icon: faRobot },
  { href: "/chat",           label: "Chat",   icon: faComments },
  { href: "/marketplace",    label: "Market", icon: faStore },
];

// Lets deeply-nested list components (FileRow/FileCard) show a "downloaded"
// badge without threading the prop through every intermediate block.
const OfflineContext = createContext({ downloadedIds: new Set() });

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
  });

  // Resolve the URL to actually use for viewing/opening/downloading.
  // Prefer the live signed URL when online; fall back to the cached blob
  // when offline or when this entry has no signed URL (i.e. it came from
  // the offline-only file list rather than a fresh API fetch).
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
        // Offline but not actually cached — try the signed URL anyway, it'll
        // just fail to load, which is expected.
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
      <div className="bg-[#0d0d14] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-bold text-white truncate pr-4">
            {editMode ? "Edit File Info" : file.title}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {isOwner && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="px-3 py-1.5 text-xs font-medium bg-white/5 border border-white/10 text-white/50 hover:text-violet-400 hover:border-violet-500/40 rounded-xl transition"
              >
                Edit
              </button>
            )}
            {editMode && (
              <button
                onClick={() => { setEditMode(false); setSaveError(""); }}
                className="px-3 py-1.5 text-xs font-medium bg-white/5 border border-white/10 text-white/50 hover:text-white/80 rounded-xl transition"
              >
                Cancel
              </button>
            )}
            <button onClick={onClose} className="text-white/30 hover:text-white transition">
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
                  {file.faculty && <span className="px-3 py-1 bg-violet-500/15 text-violet-400 border border-violet-500/20 rounded-full text-xs">{file.faculty}</span>}
                  {file.level && <span className="px-3 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-full text-xs">{file.level}L</span>}
                  {file.semester && <span className="px-3 py-1 bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded-full text-xs">{SEMESTER_LABELS[file.semester] || file.semester}</span>}
                  {file.university?.name && <span className="px-3 py-1 bg-white/5 text-white/50 border border-white/10 rounded-full text-xs">{file.university.shortName || file.university.name}</span>}
                  {downloaded && (
                    <span className="px-3 py-1 bg-sky-500/15 text-sky-400 border border-sky-500/20 rounded-full text-xs">
                      <FontAwesomeIcon icon={faCheck} className="mr-1" />Downloaded
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2 mb-5 text-sm text-white/50">
                {file.department && <p className="text-white/40"><span className="text-white/20 mr-1">Dept:</span>{file.department}</p>}
                {file.description && <p className="text-white/40">{file.description}</p>}
                {file.createdAt && <p><FontAwesomeIcon icon={faFile} className="mr-1" /> Uploaded: {formatDate(file.createdAt)}</p>}
                {file.user?.displayName && <p><FontAwesomeIcon icon={faUser} className="mr-1" /> By: {file.user?.displayName}</p>}
                {file.isPublic != null && (
                  <p>{file.isPublic ? <><FontAwesomeIcon icon={faGlobe} className="mr-1" />Public</> : <><FontAwesomeIcon icon={faLock} className="mr-1" />Private</>}</p>
                )}
                {file.fileSize && <p><FontAwesomeIcon icon={faBox} className="mr-1" /> Size: {formatBytes(file.fileSize)}</p>}
              </div>

              {resolvingUrl && (
                <div className="mb-4 py-8 text-center text-white/30 text-sm">Loading file…</div>
              )}

              {!resolvingUrl && resolvedUrl && getMimeFileType(file.fileType) === "pdf" && (
                <div className="mb-4 rounded-xl overflow-hidden border border-white/10" style={{ height: 300 }}>
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
                <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between text-xs text-white/40 mb-1.5">
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
                <label className="text-xs text-white/30 mb-1 block">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 transition"
                />
              </div>

              <div>
                <label className="text-xs text-white/30 mb-1 block">Course code</label>
                <input
                  type="text"
                  placeholder="e.g. CHM 101"
                  value={form.faculty}
                  onChange={e => setForm(f => ({ ...f, faculty: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 transition"
                />
              </div>

              <div>
                <label className="text-xs text-white/30 mb-1 block">Department</label>
                <input
                  type="text"
                  placeholder="e.g. MINING ENGINEERING"
                  value={form.department}
                  onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 transition"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-white/30 mb-1 block">Level</label>
                  <select
                    value={form.level}
                    onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none focus:border-violet-500/60 transition"
                  >
                    <option value="">— Level —</option>
                    {["100","200","300","400","500"].map(l => (
                      <option key={l} value={l}>{l} Level</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-white/30 mb-1 block">Semester</label>
                  <select
                    value={form.semester}
                    onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none focus:border-violet-500/60 transition"
                  >
                    <option value="">— Semester —</option>
                    <option value="first">1st Semester</option>
                    <option value="second">2nd Semester</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-white/30 mb-1 block">Description</label>
                <textarea
                  placeholder="Optional description..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 resize-none transition"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition mt-2"
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
        <p className="text-sm font-medium text-white truncate">{file.title}</p>
        <p className="text-xs text-white/30">{formatDate(file.createdAt)} · {file.user?.displayName}</p>
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
          "bg-white/5 text-white/40"
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
  // Sort files alphabetically by title
  const sorted = [...files].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="border border-white/[0.07] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition text-left"
      >
        <FontAwesomeIcon
          icon={open ? faFolderOpen : faFolder}
          className="text-amber-400 text-sm shrink-0"
        />
        <span className="flex-1 text-sm font-semibold text-white/80 uppercase tracking-wide">{courseName}</span>
        <span className="text-xs text-white/30 mr-2">{files.length} {files.length === 1 ? "file" : "files"}</span>
        <FontAwesomeIcon
          icon={faChevronRight}
          className={`text-white/20 text-xs transition-transform ${open ? "rotate-90" : ""}`}
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

// ─── Semester Block ────────────────────────────────────────────────
function SemesterBlock({ semesterKey, courses, user, onSelect, onDelete }) {
  const [open, setOpen] = useState(false);
  const totalFiles = Object.values(courses).reduce((a, b) => a + b.length, 0);
  const sortedCourses = Object.keys(courses).sort();

  return (
    <div className="ml-4 border-l-2 border-white/[0.06] pl-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 py-2 group w-full text-left"
      >
        <FontAwesomeIcon
          icon={faChevronRight}
          className={`text-white/20 text-xs transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="text-xs font-bold text-violet-400/80 uppercase tracking-widest">
          {SEMESTER_LABELS[semesterKey] || semesterKey}
        </span>
        <span className="text-xs text-white/20 ml-auto">{totalFiles} files</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 mt-1 mb-3">
          {sortedCourses.map(course => (
            <CourseSection
              key={course}
              courseName={course}
              files={courses[course]}
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

// ─── Level Block ──────────────────────────────────────────────────
function LevelBlock({ levelKey, semesters, user, onSelect, onDelete }) {
  const [open, setOpen] = useState(false);
  const totalFiles = Object.values(semesters).reduce((a, semObj) =>
    a + Object.values(semObj).reduce((b, arr) => b + arr.length, 0), 0
  );

const orderedSemesters = [
  ...SEMESTER_ORDER.filter(s => semesters[s]),
  ...Object.keys(semesters).filter(s => !SEMESTER_ORDER.includes(s)),
];
  return (
    <div className="border border-white/[0.08] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.03] transition text-left"
      >
        <div className="w-8 h-8 bg-violet-500/15 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-violet-400 text-xs font-black">{levelKey}L</span>
        </div>
        <span className="flex-1 text-sm font-bold text-white">{levelKey} Level</span>
        <span className="text-xs text-white/30 mr-2">{totalFiles} files</span>
        <FontAwesomeIcon
          icon={faChevronRight}
          className={`text-white/30 text-xs transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-white/[0.05] bg-white/[0.01] px-4 py-3 flex flex-col gap-2">
          {orderedSemesters.map(sem => (
            <SemesterBlock
              key={sem}
              semesterKey={sem}
              courses={semesters[sem]}
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

// ─── Department Block ─────────────────────────────────────────────
function DepartmentBlock({ deptName, levels, user, onSelect, onDelete }) {
  const [open, setOpen] = useState(false);
  const totalFiles = Object.values(levels).reduce((a, levObj) =>
    a + Object.values(levObj).reduce((b, semObj) =>
      b + Object.values(semObj).reduce((c, arr) => c + arr.length, 0), 0), 0
  );

  const orderedLevels = [
  ...LEVEL_ORDER.filter(l => levels[l]),
  ...Object.keys(levels).filter(l => !LEVEL_ORDER.includes(l)),
];

  return (
    <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden">
      {/* Department Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-violet-500/5 transition text-left"
      >
        <div className="w-10 h-10 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex items-center justify-center shrink-0">
          <FontAwesomeIcon icon={faBookOpen} className="text-violet-400 text-sm" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white uppercase tracking-wide truncate">{deptName}</p>
          <p className="text-xs text-white/30 mt-0.5">{orderedLevels.length} levels · {totalFiles} files</p>
        </div>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`text-white/30 text-sm transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Levels inside */}
      {open && (
        <div className="border-t border-white/[0.05] px-4 py-4 flex flex-col gap-3">
          {orderedLevels.map(level => (
            <LevelBlock
              key={level}
              levelKey={level}
              semesters={levels[level]}
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

// ─── Flat Grid Card (for search results) ─────────────────────────
function FileCard({ file, user, onSelect, onDelete }) {
  const { downloadedIds } = useContext(OfflineContext);
  const isDownloaded = downloadedIds.has(file.id);

  return (
    <div onClick={() => onSelect(file)} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 hover:border-violet-500/30 hover:bg-violet-500/5 transition cursor-pointer group relative">
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
      <p className="text-sm font-semibold text-white truncate mb-1">{file.title}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {file.faculty && <span className="px-2 py-0.5 bg-violet-500/15 text-violet-400 rounded-full text-xs">{file.faculty}</span>}
        {file.level && <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-full text-xs">{file.level}L</span>}
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
  const [viewMode, setViewMode] = useState("hierarchy"); // "hierarchy" | "grid"
  const [showUpload, setShowUpload] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [universitiesList, setUniversitiesList] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Offline state ──
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [downloadedIds, setDownloadedIds] = useState(new Set());
  const [showDownloadedOnly, setShowDownloadedOnly] = useState(false);
  const [usingOfflineFallback, setUsingOfflineFallback] = useState(false);

  const refreshDownloads = useCallback(async () => {
    const meta = await listDownloadedMaterials();
    setDownloadedIds(new Set(meta.map(m => m.id)));
  }, []);

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
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/study-material?search=${debouncedSearch}`,
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
  }, [user, debouncedSearch, refreshKey, isOnline]);

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

  const handleDownloadChange = useCallback(() => {
    refreshDownloads();
  }, [refreshDownloads]);

  // Filter by university, then by "downloaded only" if toggled
  const filtered = files.filter(f => {
    if (universityFilter !== "All") {
      const matchesUni = f.university?.shortName === universityFilter || f.university?.name === universityFilter;
      if (!matchesUni) return false;
    }
    if (showDownloadedOnly && !downloadedIds.has(f.id)) return false;
    return true;
  });

  // ── Build hierarchy: dept → level → semester → course → files ──
  const grouped = {};
  filtered.forEach(file => {
    const dept = file.department || "Uncategorized Department";
    const lvl  = file.level     || "Unknown";
    const sem  = file.semester  || "unknown";
    const crs  = file.faculty   || "Uncategorized Course";

    if (!grouped[dept]) grouped[dept] = {};
    if (!grouped[dept][lvl]) grouped[dept][lvl] = {};
    if (!grouped[dept][lvl][sem]) grouped[dept][lvl][sem] = {};
    if (!grouped[dept][lvl][sem][crs]) grouped[dept][lvl][sem][crs] = [];
    grouped[dept][lvl][sem][crs].push(file);
  });

  const sortedDepts = Object.keys(grouped).sort();
  const isSearching = debouncedSearch.trim().length > 0;

  return (
    <OfflineContext.Provider value={{ downloadedIds }}>
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-500 rounded-full opacity-[0.06] blur-[100px]" />
      </div>

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-full text-sm shadow-lg">
          {successMessage}
        </div>
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
              <button
                onClick={() => setShowDownloadedOnly(d => !d)}
                className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition border ${
                  showDownloadedOnly
                    ? "bg-sky-500/20 border-sky-500/40 text-sky-400"
                    : "bg-white/5 border-white/10 text-white/40 hover:text-sky-400 hover:border-sky-500/40"
                }`}
                title="Show downloaded files only"
              >
                <FontAwesomeIcon icon={faDownload} />
                {downloadedIds.size > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-sky-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {downloadedIds.size}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowCalculator(true)}
                className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/40 hover:text-violet-400 hover:border-violet-500/40 transition"
                title="Calculator"
              >
                <FontAwesomeIcon icon={faCalculator} />
              </button>
              <button
                onClick={() => setViewMode(v => v === "hierarchy" ? "grid" : "hierarchy")}
                className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/40 hover:text-violet-400 hover:border-violet-500/40 transition"
                title={viewMode === "hierarchy" ? "Grid view" : "Hierarchy view"}
              >
                <FontAwesomeIcon icon={viewMode === "hierarchy" ? faGrip : faLayerGroup} />
              </button>
              <button
                onClick={() => setShowUpload(true)}
                disabled={!isOnline}
                className="flex items-center gap-2 bg-violet-500 hover:bg-violet-400 disabled:opacity-30 disabled:cursor-not-allowed text-white px-4 py-2 rounded-full text-sm font-medium transition"
              >
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
                  className={`flex flex-col items-center py-2 px-4 border-b-2 transition text-xs gap-0.5 ${
                    isActive ? "border-violet-500 text-violet-400" : "border-transparent text-white/30 hover:text-white/60"
                  }`}>
                  <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-28 px-4 pb-10 max-w-6xl mx-auto">

        {/* Offline / fallback banner */}
        {(!isOnline || usingOfflineFallback) && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl px-4 py-2.5 mb-4 text-sm">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-xs shrink-0" />
            <span>
              {!isOnline ? "You're offline — showing your downloaded files." : "Couldn't reach the server — showing downloaded files."}
            </span>
          </div>
        )}

        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-full px-4 py-2.5 mt-4 mb-4 focus-within:border-violet-500/40 transition">
          <svg className="w-4 h-4 text-white/30 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search by title, course or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none text-white placeholder-white/20"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-white/30 hover:text-white/60 transition">
              <FontAwesomeIcon icon={faXmark} className="text-xs" />
            </button>
          )}
        </div>

        {/* University Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {["All", ...universitiesList.map(u => u.shortName || u.name)].map(u => (
            <button key={u} onClick={() => setUniversityFilter(u)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition border ${
                universityFilter === u
                  ? "bg-violet-500 text-white border-violet-500"
                  : "bg-white/[0.03] border-white/10 text-white/50 hover:border-violet-500/30 hover:text-violet-400"
              }`}>
              {u}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs text-white/30">
            {filtered.length} {filtered.length === 1 ? "file" : "files"}
            {isSearching ? ` matching "${debouncedSearch}"` : ""}
            {showDownloadedOnly ? " · downloaded only" : ""}
          </p>
          {!isSearching && (
            <p className="text-xs text-white/20">{sortedDepts.length} {sortedDepts.length === 1 ? "department" : "departments"}</p>
          )}
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white/10 rounded-2xl" />
                  <div className="flex-1">
                    <div className="h-3 bg-white/10 rounded w-1/3 mb-2" />
                    <div className="h-2 bg-white/10 rounded w-1/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4 text-white/10"><FontAwesomeIcon icon={faFile} /></p>
            <p className="text-white/40 font-medium">
              {showDownloadedOnly ? "No downloaded files yet" : "No files found"}
            </p>
            <p className="text-white/20 text-sm mt-1">
              {showDownloadedOnly
                ? "Open a file and tap \"Save for offline\" to keep it here."
                : search ? "Try a different search term" : "Upload your first file to get started"}
            </p>
            {!showDownloadedOnly && isOnline && (
              <button
                onClick={() => setShowUpload(true)}
                className="mt-4 px-6 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-sm transition"
              >
                Upload File
              </button>
            )}
          </div>
        )}

        {/* ── HIERARCHY VIEW (default) ── */}
        {!loading && filtered.length > 0 && (viewMode === "hierarchy" || !isSearching) && viewMode !== "grid" && (
          <div className="flex flex-col gap-4">
            {sortedDepts.map(dept => (
              <DepartmentBlock
                key={dept}
                deptName={dept}
                levels={grouped[dept]}
                user={user}
                onSelect={setSelectedFile}
                onDelete={() => setRefreshKey(k => k + 1)}
              />
            ))}
          </div>
        )}

        {/* ── GRID VIEW (when toggled or searching) ── */}
        {!loading && filtered.length > 0 && (viewMode === "grid" || isSearching) && (
          <>
            {isSearching && viewMode !== "grid" && (
              <p className="text-xs text-white/30 mb-3">Showing flat results for search. Switch to grid or clear search to return to hierarchy.</p>
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
      </main>

      {showUpload && (
  <UploadModal
    onClose={async (uploaded) => {
      setShowUpload(false);
      if (uploaded) {
        setSuccessMessage("File uploaded successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
        setRefreshKey(k => k + 1);
        await createNotification(user.uid, {
          type: "material",
          message: `Your file "${uploaded.title || "File"}" was uploaded successfully.`,
        });
      }
    }}
    user={user}
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

