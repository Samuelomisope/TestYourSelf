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

function ReviewRow({ file, schools, onResolved, onDismissed, onMarkedDuplicate }) {
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);

  const [schoolId, setSchoolId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [programId, setProgramId] = useState("");
  const [courseId, setCourseId] = useState("");

  const [saving, setSaving] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [markingDuplicate, setMarkingDuplicate] = useState(false);
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

  const handleConfirmDuplicate = async () => {
    setMarkingDuplicate(true);
    setError("");
    try {
      await authFetch(`/admin/materials/${file.id}/confirm-duplicate`, { method: "PATCH" });
      onMarkedDuplicate(file.id);
    } catch (err) {
      console.error(err);
      setError("Could not confirm this duplicate. Try again.");
    } finally {
      setMarkingDuplicate(false);
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

      {(file.classificationReason || file.classificationConfidence != null) && (
        <div className="mb-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.06] px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-amber-300">
              {file.classificationMethod === "AI" ? "AI suggestion — confirm below" : "Why this needs review"}
            </p>
            {file.classificationConfidence != null && (
              <span className="text-[11px] text-ink/50">
                {Math.round(file.classificationConfidence)}% confidence
              </span>
            )}
          </div>
          {file.classificationReason && (
            <p className="mt-1 text-xs leading-relaxed text-ink/55">{file.classificationReason}</p>
          )}
        </div>
      )}

      {file.duplicateOf && (
        <div className="mb-3 rounded-xl border border-orange-500/15 bg-orange-500/[0.06] px-3 py-2">
          <p className="text-xs font-semibold text-orange-300">Possible duplicate</p>
          <p className="mt-1 text-xs text-ink/55">Similar to “{file.duplicateOf.title}”. Review the match before confirming.</p>
        </div>
      )}

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
          disabled={!canSave || saving || dismissing || markingDuplicate}
          className="flex-1 py-2 bg-violet-500 hover:bg-violet-400 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={saving ? faSpinner : faCheck} className={saving ? "animate-spin" : ""} />
          {saving ? "Saving…" : "Resolve"}
        </button>

        <button
          onClick={handleDismiss}
          disabled={saving || dismissing || markingDuplicate}
          className="py-2 px-4 bg-white/[0.05] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-ink/60 border border-ink/10 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={dismissing ? faSpinner : faXmark} className={dismissing ? "animate-spin" : ""} />
          {dismissing ? "…" : "Dismiss"}
        </button>

        {file.duplicateOf && (
          <button
            onClick={handleConfirmDuplicate}
            disabled={saving || dismissing || markingDuplicate}
            className="py-2 px-3 bg-orange-500/15 hover:bg-orange-500/25 disabled:opacity-30 disabled:cursor-not-allowed text-orange-300 border border-orange-500/20 rounded-xl text-xs font-medium transition"
          >
            {markingDuplicate ? "Saving…" : "Confirm duplicate"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function NeedsReviewPanel() {
  const [files, setFiles] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [classificationJob, setClassificationJob] = useState(null);
  const [startingJob, setStartingJob] = useState(false);
  const [jobError, setJobError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [data, activeJob] = await Promise.all([
        authFetch(`/admin/materials/needs-review`),
        authFetch(`/admin/classification/jobs/latest`).catch(() => null),
      ]);
      setFiles(data);
      setClassificationJob(activeJob);

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

  useEffect(() => {
    if (!classificationJob?.id || !["QUEUED", "PROCESSING"].includes(classificationJob.status)) return;
    const timer = setInterval(() => {
      authFetch(`/admin/classification/jobs/${classificationJob.id}`)
        .then(setClassificationJob)
        .catch((err) => setJobError(err.message || "Could not refresh job progress."));
    }, 4000);
    return () => clearInterval(timer);
  }, [classificationJob?.id, classificationJob?.status]);

  const startClassification = async () => {
    setStartingJob(true);
    setJobError("");
    try {
      const job = await authFetch(`/admin/classification/jobs`, { method: "POST" });
      setClassificationJob(job);
    } catch (err) {
      setJobError(err.message || "Could not start classification.");
    } finally {
      setStartingJob(false);
    }
  };

  const handleResolved = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDismissed = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleMarkedDuplicate = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-ink/80 uppercase tracking-wide">
          Needs Review
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink/30">{files.length} flagged</span>
          <button
            onClick={startClassification}
            disabled={startingJob || ["QUEUED", "PROCESSING"].includes(classificationJob?.status)}
            className="px-3 py-2 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-violet-300 border border-violet-500/20 text-xs font-semibold transition"
          >
            {startingJob ? "Starting…" : "Organize pending materials"}
          </button>
        </div>
      </div>

      {jobError && <p className="text-pink-400 text-xs mb-3">{jobError}</p>}
      {classificationJob && (
        <div className="mb-4 rounded-2xl border border-violet-500/15 bg-violet-500/[0.05] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-ink/70">
              Classification job · {classificationJob.status.toLowerCase().replaceAll("_", " ")}
            </p>
            <span className="text-xs text-ink/45">
              {classificationJob.processed} / {classificationJob.totalItems} processed
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-violet-400 transition-all"
              style={{ width: `${classificationJob.progressPercent}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink/40">
            <span>{classificationJob.outcomes?.autoOrganized || 0} organized</span>
            <span>{classificationJob.outcomes?.needsReview || 0} need review</span>
            <span>{classificationJob.outcomes?.unableToClassify || 0} unresolved</span>
            <span>{classificationJob.outcomes?.duplicates || 0} duplicates</span>
            <span>{classificationJob.itemStates?.failed || 0} failed after retries</span>
          </div>
        </div>
      )}

      {loading && <p className="text-ink/30 text-sm">Loading…</p>}
      {error && <p className="text-pink-400 text-sm">{error}</p>}

      {!loading && files.length === 0 && !error && (
        <p className="text-ink/30 text-sm py-8 text-center">
          Nothing flagged for review right now.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {files.map((file) => (
          <ReviewRow key={file.id} file={file} schools={schools} onResolved={handleResolved} onDismissed={handleDismissed} onMarkedDuplicate={handleMarkedDuplicate} />
        ))}
      </div>
    </div>
  );
}
