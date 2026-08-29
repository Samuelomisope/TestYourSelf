import { useState, useEffect } from "react";
import { getAccessToken } from "./token";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation, faCheck, faSpinner, faXmark } from "@fortawesome/free-solid-svg-icons";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function authFetch(path, options = {}) {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${path}`);
  return res.json();
}

function ReviewRow({ file, schools, onResolved, onDismissed }) {
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);

  const [schoolId, setSchoolId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [programId, setProgramId] = useState("");
  const [courseId, setCourseId] = useState("");

  const [saving, setSaving] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState("");

  // Cascade: school -> departments
  useEffect(() => {
    setDepartmentId(""); setProgramId(""); setCourseId("");
    setDepartments([]); setPrograms([]); setCourses([]);
    if (!schoolId) return;
    authFetch(`/departments?schoolId=${schoolId}`)
      .then(setDepartments)
      .catch(() => setError("Could not load departments."));
  }, [schoolId]);

  // Cascade: department -> programs
  useEffect(() => {
    setProgramId(""); setCourseId("");
    setPrograms([]); setCourses([]);
    if (!departmentId) return;
    authFetch(`/programs?departmentId=${departmentId}`)
      .then(setPrograms)
      .catch(() => setError("Could not load programs."));
  }, [departmentId]);

  // Cascade: program -> courses (via /programs/:id which includes courses)
  useEffect(() => {
    setCourseId("");
    setCourses([]);
    if (!programId) return;
    authFetch(`/programs/${programId}`)
      .then((p) => setCourses(p.courses || []))
      .catch(() => setError("Could not load courses."));
  }, [programId]);

  const canSave = !!courseId;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await authFetch(`/admin/materials/${file.id}/resolve-review`, {
        method: "PATCH",
        body: JSON.stringify({ courseId }),
      });
      onResolved(file.id);
    } catch (err) {
      console.error(err);
      setError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = async () => {
    setDismissing(true);
    setError("");
    try {
      await authFetch(`/admin/materials/${file.id}/dismiss-review`, {
        method: "PATCH",
      });
      onDismissed(file.id);
    } catch (err) {
      console.error(err);
      setError("Could not dismiss. Try again.");
    } finally {
      setDismissing(false);
    }
  };

  const selectClass =
    "bg-black/40 border border-ink/10 rounded-xl px-3 py-2 text-sm text-ink/70 outline-none focus:border-violet-500/60 transition disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="bg-white/[0.03] border border-ink/10 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
      <a 
         href={file.signedUrl}
         target="_blank"
         rel="noopener noreferrer"
         className="text-sm font-semibold text-ink hover:text-violet-400 truncate block transition"
        >
       {file.title}
      </a>
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
        <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className={selectClass}>
          <option value="">— School —</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
          ))}
        </select>

        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          disabled={!schoolId}
          className={selectClass}
        >
          <option value="">— Department —</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <select
          value={programId}
          onChange={(e) => setProgramId(e.target.value)}
          disabled={!departmentId}
          className={selectClass}
        >
          <option value="">— Program —</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          disabled={!programId}
          className={selectClass}
        >
          <option value="">— Course —</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!canSave || saving || dismissing}
          className="flex-1 py-2 bg-violet-500 hover:bg-violet-400 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={saving ? faSpinner : faCheck} className={saving ? "animate-spin" : ""} />
          {saving ? "Saving…" : "Resolve"}
        </button>

        <button
          onClick={handleDismiss}
          disabled={saving || dismissing}
          className="py-2 px-4 bg-white/[0.05] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-ink/60 border border-ink/10 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={dismissing ? faSpinner : faXmark} className={dismissing ? "animate-spin" : ""} />
          {dismissing ? "…" : "Dismiss"}
        </button>
      </div>
    </div>
  );
}

export default function NeedsReviewPanel() {
  const [files, setFiles] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await authFetch(`/admin/materials/needs-review`);
      setFiles(data);

      // Fetch schools once, using the first material's universityId
      // (safe assumption: all flagged materials share the same university for now)
      if (data.length > 0) {
        const schoolList = await authFetch(`/schools?universityId=${data[0].universityId}`);
        setSchools(schoolList);
      }
    } catch (err) {
      console.error(err);
      setError("Could not load flagged files.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleResolved = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDismissed = (id) => {
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
          <ReviewRow key={file.id} file={file} schools={schools} onResolved={handleResolved} onDismissed={handleDismissed} />
        ))}
      </div>
    </div>
  );
}