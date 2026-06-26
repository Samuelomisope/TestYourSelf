import { getAccessToken } from "./token";
import { useState, useEffect, useRef } from "react";
import { auth } from "./firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark, faLock, faGlobe,
} from "@fortawesome/free-solid-svg-icons";
import { faFileLines, faVideo, faNoteSticky } from "@fortawesome/free-solid-svg-icons";

// ─── Constants ─────────────────────────────────────────────────────
const FILE_ICONS = {
  pdf:     <FontAwesomeIcon icon={faFileLines} />,
  video:   <FontAwesomeIcon icon={faVideo} />,
  note:    <FontAwesomeIcon icon={faNoteSticky} />,
  default: <FontAwesomeIcon icon={faFileLines} />,
};

const LEVELS = ["100", "200", "300", "400", "500"];

const getFileType = (name) => {
  const ext = name?.split(".").pop().toLowerCase();
  if (["pdf"].includes(ext)) return "pdf";
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return "video";
  if (["doc", "docx", "txt", "ppt", "pptx"].includes(ext)) return "note";
  return "default";
};

// ─── Google Picker Loader ──────────────────────────────────────────
function loadGoogleApis() {
  return new Promise((resolve) => {
    if (window.gapi && window.google?.picker) return resolve();
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      window.gapi.load("picker", resolve);
    };
    document.body.appendChild(script);
  });
}

// ─── Upload Modal ──────────────────────────────────────────────────
export function UploadModal({ onClose, universitiesList = [] }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [progresses, setProgresses] = useState({});
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [isPublic, setIsPublic] = useState(false);
  const [driveLoading, setDriveLoading] = useState(false);
  const fileRef = useRef();

  // Pre-load Google APIs silently when modal mounts
  useEffect(() => {
    loadGoogleApis().catch(() => {});
  }, []);

  // ── Local file handling ──────────────────────────────────────────
  const handleFiles = (selected) => {
    const incoming = Array.from(selected);
    const valid = incoming.filter((f) => f.size <= 100 * 1024 * 1024);
    if (valid.length < incoming.length)
      setError("Some files exceed 100 MB and were skipped.");
    setFiles((prev) => [
      ...prev,
      ...valid.map((f) => ({
        file: f,
        title: f.name.replace(/\.[^/.]+$/, ""),
        course: "",       // faculty / course code e.g. "CHM 101"
        department: "",   // e.g. "MINING ENGINEERING"
        level: "",        // e.g. "100"
        semester: "",     // "first" | "second"
        description: "",
        university: "",
        source: "local",
      })),
    ]);
    setExpandedIndex((prev) => (prev === null ? 0 : prev));
  };

  // ── Get a Drive access token ─────────────────────────────────────
  const getDriveAccessToken = () =>
  new Promise((resolve, reject) => {
    const loadGIS = () =>
      new Promise((res) => {
        if (window.google?.accounts?.oauth2) return res();
        const s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.onload = res;
        document.body.appendChild(s);
      });

    loadGIS().then(() => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/drive.file",
        login_hint: auth.currentUser?.email ?? "",
        callback: (response) => {
          if (response.error) return reject(new Error(response.error));
          localStorage.setItem("googleAccessToken", response.access_token);
          resolve(response.access_token);
        },
      });
      client.requestAccessToken();
    });
  });

  // ── Google Drive picker ──────────────────────────────────────────
  const openGooglePicker = async () => {
    setError("");
    setDriveLoading(true);
    try {
      await loadGoogleApis();
      const accessToken = await getDriveAccessToken();

      const picker = new window.google.picker.PickerBuilder()
        .addView(
          new window.google.picker.DocsView()
            .setIncludeFolders(false)
            .setMimeTypes(
              [
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "application/vnd.ms-powerpoint",
                "text/plain",
                "video/mp4",
                "video/quicktime",
              ].join(",")
            )
        )
        .setOAuthToken(accessToken)
        .setDeveloperKey(import.meta.env.VITE_GOOGLE_API_KEY)
        .setCallback(async (data) => {
          if (data.action === window.google.picker.Action.PICKED) {
            await handleDriveFiles(data.docs, accessToken);
          }
        })
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .build();

      picker.setVisible(true);
    } catch (err) {
      console.error(err);
      setError("Could not open Google Drive. Please try again.");
    } finally {
      setDriveLoading(false);
    }
  };

  const handleDriveFiles = async (docs, accessToken) => {
    setDriveLoading(true);
    const added = [];
    for (const doc of docs) {
      try {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) throw new Error(`Failed to fetch ${doc.name}`);
        const blob = await res.blob();
        const file = new File([blob], doc.name, { type: doc.mimeType });
        if (file.size > 100 * 1024 * 1024) {
          setError((e) => (e ? e + " " : "") + `"${doc.name}" exceeds 100 MB and was skipped.`);
          continue;
        }
        added.push({
          file,
          title: doc.name.replace(/\.[^/.]+$/, ""),
          course: "",
          department: "",
          level: "",
          semester: "",
          description: "",
          university: "",
          source: "drive",
        });
      } catch (err) {
        console.error(err);
        setError((e) => (e ? e + " " : "") + `Could not download "${doc.name}" from Drive.`);
      }
    }
    if (added.length > 0) {
      setFiles((prev) => [...prev, ...added]);
      setExpandedIndex((prev) => (prev === null ? 0 : prev));
    }
    setDriveLoading(false);
  };

  // ── Metadata helpers ─────────────────────────────────────────────
  const updateMeta = (index, field, value) =>
    setFiles((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setExpandedIndex(null);
  };

  const [mode, setMode] = useState("files"); // "files" | "zip"
const [zipFile, setZipFile] = useState(null);
const [zipMeta, setZipMeta] = useState({ department: "", level: "", semester: "" });
const [zipProgress, setZipProgress] = useState(0);
const [zipSummary, setZipSummary] = useState(null);
const zipRef = useRef();
  // ── Upload ───────────────────────────────────────────────────────
  const uploadSingle = (item, token) =>
    new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("title", item.title || item.file.name);
      formData.append("description", item.description);
      formData.append("faculty", item.course);           // course code
      formData.append("department", item.department);    // department name
      formData.append("level", item.level);              // 100 / 200 / etc
      formData.append("semester", item.semester);        // first / second
      formData.append("isPublic", String(isPublic));
      if (item.university) formData.append("university", item.university);

      const xhr = new XMLHttpRequest();
      xhr.open(
        "POST",
        `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/study-material/upload`
      );
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.timeout = 300000;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable)
          setProgresses((prev) => ({
            ...prev,
            [item.file.name]: Math.round((e.loaded / e.total) * 100),
          }));
      };
      xhr.onload = () =>
        xhr.status === 200 || xhr.status === 201
          ? resolve()
          : reject(new Error(`Failed: ${item.file.name}`));
      xhr.onerror = () => reject(new Error(`Error uploading ${item.file.name}`));
      xhr.send(formData);
    });

    const uploadZip = (token) =>
  new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("zipFile", zipFile);
    formData.append("department", zipMeta.department);
    formData.append("level", zipMeta.level);
    formData.append("semester", zipMeta.semester);
    formData.append("isPublic", String(isPublic));

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/study-material/bulk-upload`
    );
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.timeout = 600000; // zips take longer than a single file
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setZipProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status === 200 || xhr.status === 201
        ? resolve(JSON.parse(xhr.responseText))
        : reject(new Error("Bulk upload failed"));
    xhr.onerror = () => reject(new Error("Error uploading zip"));
    xhr.send(formData);
  });

const handleZipUpload = async () => {
  if (!zipFile) { setError("Please select a zip file."); return; }
  if (!zipMeta.department || !zipMeta.level || !zipMeta.semester) {
    setError("Please set department, level and semester for this batch.");
    return;
  }
  setUploading(true);
  setError("");
  try {
    const { getIdToken } = await import("firebase/auth");
    const token = getAccessToken();
    const summary = await uploadZip(token);
    setZipSummary(summary);
    if (summary.skipped.length === 0) onClose(true);
  } catch (err) {
    console.error(err);
    setError("Bulk upload failed. Try again.");
  } finally {
    setUploading(false);
  }
};

  const handleUpload = async () => {
    if (files.length === 0) { setError("Please select at least one file."); return; }
    setUploading(true);
    setError("");
    try {
      const { auth } = await import("./firebase");
      const { getIdToken } = await import("firebase/auth");
      const token = getAccessToken();
      const results = await Promise.allSettled(files.map((f) => uploadSingle(f, token)));
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length === 0) onClose(true);
      else if (failed.length < files.length) {
        setError(`${failed.length} file(s) failed. Others uploaded successfully.`);
        setUploading(false);
      } else {
        setError("All uploads failed. Please try again.");
        setUploading(false);
      }
    } catch (err) {
      console.error(err);
      setError("Upload failed. Try again.");
      setUploading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-[#0d0d14] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl p-6 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-white text-lg">Upload Files</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white transition">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {error && <p className="text-pink-400 text-sm mb-3">{error}</p>}

        <div className="flex gap-2 mb-4 bg-white/5 rounded-2xl p-1">
  <button
    onClick={() => setMode("files")}
    className={`flex-1 py-1.5 rounded-xl text-sm font-medium transition ${
      mode === "files" ? "bg-violet-500 text-white" : "text-white/40"
    }`}
  >
    Files
  </button>
  <button
    onClick={() => setMode("zip")}
    className={`flex-1 py-1.5 rounded-xl text-sm font-medium transition ${
      mode === "zip" ? "bg-violet-500 text-white" : "text-white/40"
    }`}
  >
    Bulk zip
  </button>
</div>
        {mode === "files" && (
          <>
            {/* Local drag-drop zone */}
            <div
              onClick={() => fileRef.current.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              className="border-2 border-dashed border-violet-500/30 rounded-2xl p-5 text-center cursor-pointer hover:border-violet-500/60 hover:bg-violet-500/5 transition mb-3"
            >
              <p className="text-3xl mb-1">☁️</p>
              <p className="text-sm text-white/50">Tap or drag files here</p>
              <p className="text-xs text-white/30 mt-1">PDF, Video, Word, PowerPoint — max 100 MB each</p>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.mp4,.mov,.avi,.mkv,.webm"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {/* Google Drive button */}
            <button
              type="button"
              onClick={openGooglePicker}
              disabled={driveLoading}
              className="w-full py-2.5 mb-4 border border-white/10 rounded-2xl text-sm text-white/50 hover:border-violet-500/40 hover:text-violet-400 disabled:opacity-40 transition flex items-center justify-center gap-2"
            >
              {driveLoading ? (
                <span className="animate-spin w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full" />
              ) : (
                <svg viewBox="0 0 87.3 78" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                  <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                  <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                </svg>
              )}
              {driveLoading ? "Connecting to Drive…" : "Import from Google Drive"}
            </button>

            {/* File list */}
            {files.length > 0 && (
              <div className="mb-4 space-y-2">
                {files.map((item, i) => (
                  <div key={i} className="border border-white/10 rounded-2xl overflow-hidden">
                    <div
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/5"
                      onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                    >
                      <span className="text-violet-400">
                        {FILE_ICONS[getFileType(item.file.name)]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-white truncate">
                            {item.title || item.file.name}
                          </p>
                          {item.source === "drive" && (
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                              Drive
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/30">
                          {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        {progresses[item.file.name] !== undefined && (
                          <div className="w-full bg-white/10 rounded-full h-1 mt-1">
                            <div
                              className="bg-violet-500 h-1 rounded-full transition-all"
                              style={{ width: `${progresses[item.file.name]}%` }}
                            />
                          </div>
                        )}
                      </div>
                      {!uploading && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          className="text-pink-400 hover:text-pink-300 transition text-xs"
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                      )}
                    </div>

                    {expandedIndex === i && (
                      <div className="px-3 pb-3 pt-1 border-t border-white/5 bg-white/[0.02] space-y-2">
                        <input type="text" placeholder="Title *" value={item.title} onChange={(e) => updateMeta(i, "title", e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 transition" />
                        <input type="text" placeholder="Course code e.g. CHM 101" value={item.course} onChange={(e) => updateMeta(i, "course", e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 transition" />
                        <input type="text" placeholder="Department e.g. MINING ENGINEERING" value={item.department} onChange={(e) => updateMeta(i, "department", e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 transition" />
                        <div className="flex gap-2">
                          <select value={item.level} onChange={(e) => updateMeta(i, "level", e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/70 outline-none focus:border-violet-500/60 transition">
                            <option value="">Level</option>
                            {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
                          </select>
                          <select value={item.semester} onChange={(e) => updateMeta(i, "semester", e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/70 outline-none focus:border-violet-500/60 transition">
                            <option value="">Semester</option>
                            <option value="first">1st Semester</option>
                            <option value="second">2nd Semester</option>
                          </select>
                        </div>
                        <select value={item.university} onChange={(e) => updateMeta(i, "university", e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/70 outline-none focus:border-violet-500/60 transition">
                          <option value="">Select University</option>
                          {universitiesList.map((u) => <option key={u.id} value={u.shortName || u.name}>{u.name}</option>)}
                        </select>
                        <textarea placeholder="Description (optional)" value={item.description} onChange={(e) => updateMeta(i, "description", e.target.value)} rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 resize-none transition" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {mode === "zip" && (
          <div className="mb-4">
            <div
              onClick={() => zipRef.current.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setZipFile(f); }}
              className="border-2 border-dashed border-violet-500/30 rounded-2xl p-5 text-center cursor-pointer hover:border-violet-500/60 hover:bg-violet-500/5 transition mb-3"
            >
              {zipFile ? (
                <p className="text-sm text-white">{zipFile.name} ({(zipFile.size / 1024 / 1024).toFixed(2)} MB)</p>
              ) : (
                <>
                  <p className="text-sm text-white/50">Tap or drag a .zip here</p>
                  <p className="text-xs text-white/30 mt-1">Each top-level folder becomes a course code</p>
                </>
              )}
              <input ref={zipRef} type="file" className="hidden" accept=".zip" onChange={(e) => setZipFile(e.target.files[0] || null)} />
            </div>

            <input type="text" placeholder="Department e.g. MINING ENGINEERING" value={zipMeta.department} onChange={(e) => setZipMeta((m) => ({ ...m, department: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 transition mb-2" />

            <div className="flex gap-2 mb-2">
              <select value={zipMeta.level} onChange={(e) => setZipMeta((m) => ({ ...m, level: e.target.value }))} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/70 outline-none focus:border-violet-500/60 transition">
                <option value="">Level</option>
                {LEVELS.map((l) => <option key={l} value={l}>{l} Level</option>)}
              </select>
              <select value={zipMeta.semester} onChange={(e) => setZipMeta((m) => ({ ...m, semester: e.target.value }))} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/70 outline-none focus:border-violet-500/60 transition">
                <option value="">Semester</option>
                <option value="first">1st Semester</option>
                <option value="second">2nd Semester</option>
              </select>
            </div>

            {uploading && zipProgress > 0 && (
              <div className="w-full bg-white/10 rounded-full h-1 mb-2">
                <div className="bg-violet-500 h-1 rounded-full transition-all" style={{ width: `${zipProgress}%` }} />
              </div>
            )}

            {zipSummary && (
              <div className="text-xs text-white/50 mt-2 space-y-1">
                <p>{zipSummary.uploaded.length} file(s) uploaded across {zipSummary.courses.length} course(s): {zipSummary.courses.join(", ")}</p>
                {zipSummary.skipped.length > 0 && (
                  <p className="text-pink-400">{zipSummary.skipped.length} skipped — {zipSummary.skipped.map(s => s.file).join(", ")}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Privacy toggle */}
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => setIsPublic(false)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition ${
              !isPublic ? "bg-violet-500 text-white border-violet-500" : "text-white/40 border-white/10"
            }`}
          >
            <FontAwesomeIcon icon={faLock} className="mr-1" /> Private
          </button>
          <button
            type="button"
            onClick={() => setIsPublic(true)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition ${
              isPublic ? "bg-violet-500 text-white border-violet-500" : "text-white/40 border-white/10"
            }`}
          >
            <FontAwesomeIcon icon={faGlobe} className="mr-1" /> Public
          </button>
        </div>

        {/* Upload button */}
        <button
  onClick={mode === "zip" ? handleZipUpload : handleUpload}
  disabled={uploading || (mode === "files" ? files.length === 0 : !zipFile)}
  className="w-full py-3 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white rounded-2xl font-medium transition"
>
  {uploading
    ? mode === "zip" ? `Uploading zip… ${zipProgress}%` : `Uploading ${files.length} file(s)…`
    : mode === "zip" ? "Upload zip" : `Upload${files.length > 0 ? ` (${files.length})` : ""}`}
</button>
      </div>
    </div>
  );
}

export default UploadModal;


