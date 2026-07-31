import { useState, useEffect } from "react";
import { getAccessToken } from "./token";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation, faCheck, faSpinner } from "@fortawesome/free-solid-svg-icons";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function ReviewRow({ file, onResolved }) {
  const [form, setForm] = useState({
    department: file.department || "",
    level: file.level || "",
    semester: file.semester || "",
    faculty: file.faculty || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSave = form.department && form.level && form.semester && form.faculty;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/study-material/${file.id}/resolve-review`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      onResolved(file.id);
    } catch (err) {
      console.error(err);
      setError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/[0.03] border border-ink/10 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{file.title}</p>
          <p className="text-xs text-ink/30 mt-0.5">
            {file.user?.displayName} · {file.university?.shortName || file.university?.name || "—"}
          </p>
        </div>
        <span className="shrink-0 px-2 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-full text-xs flex items-center gap-1">
          <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" />
          Needs review
        </span>
      </div>

      {error && <p className="text-pink-400 text-xs mb-2">{error}</p>}

      <div className="grid grid-cols-2 gap-2 mb-3">
        <input
          placeholder="Department"
          value={form.department}
          onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
          className="bg-black/40 border border-ink/10 rounded-xl px-3 py-2 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 transition"
        />
        <input
          placeholder="Course code (e.g. CHM 101)"
          value={form.faculty}
          onChange={(e) => setForm((f) => ({ ...f, faculty: e.target.value }))}
          className="bg-black/40 border border-ink/10 rounded-xl px-3 py-2 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 transition"
        />
        <select
          value={form.level}
          onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
          className="bg-black/40 border border-ink/10 rounded-xl px-3 py-2 text-sm text-ink/70 outline-none focus:border-violet-500/60 transition"
        >
          <option value="">— Level —</option>
          {["100", "200", "300", "400", "500"].map((l) => (
            <option key={l} value={l}>{l} Level</option>
          ))}
        </select>
        <select
          value={form.semester}
          onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))}
          className="bg-black/40 border border-ink/10 rounded-xl px-3 py-2 text-sm text-ink/70 outline-none focus:border-violet-500/60 transition"
        >
          <option value="">— Semester —</option>
          <option value="first">1st Semester</option>
          <option value="second">2nd Semester</option>
        </select>
      </div>

      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className="w-full py-2 bg-violet-500 hover:bg-violet-400 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
      >
        <FontAwesomeIcon icon={saving ? faSpinner : faCheck} className={saving ? "animate-spin" : ""} />
        {saving ? "Saving…" : "Resolve"}
      </button>
    </div>
  );
}

export default function NeedsReviewPanel() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
  setLoading(true);
  setError("");
  try {
    const token = getAccessToken();
    const res = await fetch(`${API_URL}/study-material/needs-review`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Request failed");
    setFiles(await res.json());
  } catch (err) {
    console.error(err);
    setError("Could not load flagged files.");
  } finally {
    setLoading(false);
  }
};

// eslint-disable-next-line react-hooks/set-state-in-effect -- false positive, `load` is
// already async; see https://github.com/react/react/issues/34743
useEffect(() => { load(); }, []);

const handleResolved = (id) => {
  setFiles((prev) => prev.filter((f) => f.id !== id));
};

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-ink/80 uppercase tracking-wide">
          Needs Review
        </h2>
        <span className="text-xs text-ink/30">{files.length} flagged</span>
      </div>

      {loading && <p className="text-ink/30 text-sm">Loading…</p>}
      {error && <p className="text-pink-400 text-sm">{error}</p>}

      {!loading && files.length === 0 && !error && (
        <p className="text-ink/30 text-sm py-8 text-center">
          Nothing flagged for review right now.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {files.map((file) => (
          <ReviewRow key={file.id} file={file} onResolved={handleResolved} />
        ))}
      </div>
    </div>
  );
}