import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "./Navbar";
import { apiDelete, apiGet, apiPatch, apiPost, apiPostForm } from "./api";

const card = "rounded-2xl border border-ink/10 bg-bg-elevated p-5 shadow-sm";

function ErrorLine({ children }) {
  return children ? <p role="alert" className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500">{children}</p> : null;
}

function Lesson({ lesson }) {
  if (!lesson) return null;
  return (
    <div className="mt-4 space-y-4">
      <p className="whitespace-pre-wrap leading-7 text-ink/80">{lesson.summary}</p>
      {lesson.steps?.length > 0 && <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400">Step by step</h3>
        {lesson.steps.map((step) => <section key={step.id} className="rounded-xl bg-ink/[0.035] p-4">
          <h4 className="font-semibold text-ink">{step.title}</h4><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink/70">{step.explanation}</p>
        </section>)}
      </div>}
      {lesson.examples?.map((example, index) => <section key={`${example.title}-${index}`} className="rounded-xl border border-violet-500/15 bg-violet-500/[0.04] p-4">
        <h3 className="font-semibold text-violet-400">{example.title}</h3><p className="mt-2 text-sm text-ink/75">{example.prompt}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink/70">{example.solutionSteps?.map((step, i) => <li key={i}>{step}</li>)}</ol>
      </section>)}
      {lesson.sources?.length > 0 && <div className="text-xs text-ink/40">Sources: {[...new Set(lesson.sources.map((source) => source.title))].join(", ")}</div>}
      {lesson.followUpQuestion && <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-600">{lesson.followUpQuestion}</p>}
    </div>
  );
}

export default function Classroom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [session, setSession] = useState(null);
  const [turns, setTurns] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [materialSearch, setMaterialSearch] = useState("");
  const [topic, setTopic] = useState("");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try { setSessions(await apiGet("/classroom/sessions")); }
    catch (e) { setError(e.message || "Could not load classroom sessions."); }
    finally { setLoading(false); }
  }, []);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const [current, history, docs] = await Promise.all([
        apiGet(`/classroom/sessions/${sessionId}`),
        apiGet(`/classroom/sessions/${sessionId}/turns?limit=100`),
        apiGet(`/classroom/sessions/${sessionId}/documents`),
      ]);
      setSession(current); setTurns(history); setDocuments(docs);
    } catch (e) { setError(e.message || "Could not load this classroom."); }
    finally { setLoading(false); }
  }, [sessionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { if (sessionId) void loadSession(); else void loadDashboard(); }, 0);
    return () => window.clearTimeout(timer);
  }, [sessionId, loadSession, loadDashboard]);

  async function createSession(e) {
    e.preventDefault(); if (!topic.trim()) return;
    setBusy(true); setError("");
    try {
      const created = await apiPost("/classroom/sessions", { topic: topic.trim(), title: topic.trim() });
      navigate(`/classroom/${created.id}`);
    } catch (err) { setError(err.message || "Could not create a lesson."); }
    finally { setBusy(false); }
  }

  async function sendQuestion(e) {
    e.preventDefault(); if (!question.trim() || busy) return;
    setBusy(true); setError("");
    try {
      await apiPost(`/classroom/sessions/${sessionId}/turns`, {
        message: question.trim(), idempotencyKey: crypto.randomUUID(),
      });
      setQuestion("");
      const [history, current] = await Promise.all([
        apiGet(`/classroom/sessions/${sessionId}/turns?limit=100`),
        apiGet(`/classroom/sessions/${sessionId}`),
      ]);
      setTurns(history); setSession(current);
    } catch (err) { setError(err.message || "The tutor could not respond."); }
    finally { setBusy(false); }
  }

  async function uploadDocument(e) {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    setBusy(true); setError("");
    try {
      const data = new FormData(); data.append("file", file);
      await apiPostForm(`/classroom/sessions/${sessionId}/documents`, data);
      setDocuments(await apiGet(`/classroom/sessions/${sessionId}/documents`));
    } catch (err) { setError(err.message || "Could not process this document."); }
    finally { setBusy(false); }
  }

  async function linkMaterial(materialId) {
    setBusy(true); setError("");
    try {
      await apiPost(`/classroom/sessions/${sessionId}/materials`, { materialId });
      setDocuments(await apiGet(`/classroom/sessions/${sessionId}/documents`));
    } catch (err) { setError(err.message || "Could not link this material."); }
    finally { setBusy(false); }
  }

  async function removeDocument(id) {
    setBusy(true); setError("");
    try {
      const result = await apiDelete(`/classroom/sessions/${sessionId}/documents/${id}`);
      setDocuments(await apiGet(`/classroom/sessions/${sessionId}/documents`));
      if (result.status === "DELETE_FAILED") setError("Storage deletion failed. The file is hidden from lessons; retry removal from the document list.");
    } catch (err) { setError(err.message || "Deletion is pending. Retry from the document list."); }
    finally { setBusy(false); }
  }

  async function retryDocument(id) {
    setBusy(true); setError("");
    try {
      await apiPost(`/classroom/sessions/${sessionId}/documents/${id}/retry`, {});
      setDocuments(await apiGet(`/classroom/sessions/${sessionId}/documents`));
    } catch (err) { setError(err.message || "Could not retry document processing."); }
    finally { setBusy(false); }
  }

  async function searchMaterials(e) {
    e.preventDefault(); if (!materialSearch.trim()) return;
    setBusy(true); setError("");
    try {
      const result = await apiGet(`/study-material?search=${encodeURIComponent(materialSearch.trim())}`);
      setMaterials(Array.isArray(result) ? result : []);
    } catch (err) { setError(err.message || "Could not search UniLib materials."); }
    finally { setBusy(false); }
  }

  async function renameSession() {
    const title = window.prompt("Lesson title", session?.title || "");
    if (!title?.trim()) return;
    try { setSession(await apiPatch(`/classroom/sessions/${sessionId}`, { title: title.trim() })); }
    catch (err) { setError(err.message || "Could not update lesson."); }
  }

  async function deleteSession() {
    if (!window.confirm("Delete this lesson and its uploaded classroom documents?")) return;
    setBusy(true); setError("");
    try {
      const result = await apiDelete(`/classroom/sessions/${sessionId}`);
      if (result.status === "DELETE_FAILED") throw new Error("Some files could not be deleted. Reopen the lesson and retry deletion.");
      navigate("/classroom");
    } catch (err) { setError(err.message || "Could not delete this lesson."); }
    finally { setBusy(false); }
  }

  return <>
    <Navbar />
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-16 pt-36 text-ink sm:px-6">
      {!sessionId ? <>
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">UniLib learning</p><h1 className="mt-2 text-3xl font-black">AI Classroom</h1><p className="mt-2 max-w-xl text-sm text-ink/55">Start a guided lesson, attach your notes, and return to saved conversations when you’re ready.</p></div>
        </header>
        <form onSubmit={createSession} className={`${card} mb-8`}>
          <label htmlFor="classroom-topic" className="block text-sm font-semibold">What would you like to learn?</label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input id="classroom-topic" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={160} required placeholder="e.g. Integration by substitution" className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-bg px-4 py-3 outline-none focus:border-violet-500" />
            <button disabled={busy} className="rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Starting…" : "Start lesson"}</button>
          </div>
          <ErrorLine>{error}</ErrorLine>
        </form>
        <section><h2 className="mb-3 text-lg font-bold">Your lessons</h2>
          {loading ? <p className="text-sm text-ink/50">Loading lessons…</p> : sessions.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{sessions.map((item) => <button key={item.id} onClick={() => navigate(`/classroom/${item.id}`)} className={`${card} text-left transition hover:border-violet-500/40`}><h3 className="font-bold">{item.title || item.topic}</h3><p className="mt-1 text-sm text-ink/55">{item.topic}</p><p className="mt-3 text-xs text-ink/40">{item._count?.turns || 0} messages · Updated {new Date(item.updatedAt).toLocaleDateString()}</p></button>)}</div> : <div className={card}><p className="text-sm text-ink/55">No saved lessons yet. Start with a topic above.</p></div>}
        </section>
      </> : <>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div><button onClick={() => navigate("/classroom")} className="text-sm text-violet-400">← All lessons</button><h1 className="mt-2 text-2xl font-black">{session?.title || session?.topic || "AI Classroom"}</h1><p className="text-sm text-ink/50">{session?.topic}</p></div>
          <div className="flex gap-2"><button onClick={renameSession} className="rounded-lg border border-ink/10 px-3 py-2 text-sm">Rename</button><button disabled={busy} onClick={deleteSession} className="rounded-lg border border-red-500/20 px-3 py-2 text-sm text-red-500">Delete lesson</button></div>
        </div>
        <ErrorLine>{error}</ErrorLine>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className={`${card} flex min-h-[65vh] flex-col`}>
            <div className="mb-4 flex-1 space-y-5 overflow-y-auto">
              {loading ? <p className="text-sm text-ink/50">Loading lesson…</p> : turns.length ? turns.map((turn) => <article key={turn.id} className={`rounded-2xl p-4 ${turn.role === "STUDENT" ? "ml-8 bg-violet-500/10" : "mr-4 bg-ink/[0.035]"}`}>
                <p className="text-xs font-bold uppercase tracking-wider text-ink/40">{turn.role === "STUDENT" ? "You" : "UniLib Tutor"}</p>
                {turn.role === "TUTOR" ? <Lesson lesson={turn.structuredLesson} /> : <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{turn.content}</p>}
              </article>) : <div className="py-12 text-center"><p className="text-lg font-semibold">Your lesson starts here</p><p className="mt-2 text-sm text-ink/50">Ask for a step-by-step explanation or attach lecture notes.</p></div>}
            </div>
            <form onSubmit={sendQuestion} className="flex gap-2 border-t border-ink/10 pt-4">
              <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={4000} placeholder="Ask your tutor a question…" className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-bg px-4 py-3 outline-none focus:border-violet-500" />
              <button disabled={busy || !question.trim()} className="rounded-xl bg-violet-600 px-5 font-semibold text-white disabled:opacity-50">{busy ? "…" : "Send"}</button>
            </form>
          </section>
          <aside className="space-y-4">
            <section className={card}><h2 className="font-bold">Class materials</h2><label className="mt-3 block cursor-pointer rounded-xl border border-dashed border-violet-500/30 p-4 text-center text-sm text-violet-400 hover:bg-violet-500/5">Upload PDF, DOCX, TXT, or image<input type="file" accept="application/pdf,.pdf,.docx,.txt,image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={uploadDocument} /></label>
              <div className="mt-3 space-y-2">{documents.map((doc) => <div key={doc.id} className="flex items-start justify-between gap-2 rounded-xl bg-ink/[0.035] p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{doc.originalName}</p><p className="text-xs text-ink/45">{doc.status}{doc.extractedChars ? ` · ${doc.extractedChars.toLocaleString()} chars` : ""}</p>{["FAILED", "DELETE_FAILED", "DELETE_PENDING"].includes(doc.status) && <button disabled={busy} onClick={() => retryDocument(doc.id)} className="mt-1 text-xs font-semibold text-amber-600">{doc.status === "FAILED" ? "Retry processing" : "Retry deletion"}</button>}</div><button disabled={busy} onClick={() => removeDocument(doc.id)} className="text-xs text-red-500">Remove</button></div>)}</div>
            </section>
            <section className={card}><h2 className="font-bold">Link UniLib material</h2><p className="mt-1 text-xs text-ink/50">Only materials you can access are accepted.</p><form onSubmit={searchMaterials} className="mt-3 flex gap-2"><input value={materialSearch} onChange={(e) => setMaterialSearch(e.target.value)} maxLength={100} placeholder="Search materials" className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-bg px-3 py-2 text-sm" /><button disabled={busy} className="rounded-lg bg-violet-600 px-3 text-sm text-white">Find</button></form><div className="mt-3 max-h-64 space-y-2 overflow-y-auto">{materials.slice(0, 30).map((material) => <div key={material.id} className="rounded-xl border border-ink/5 p-3"><p className="line-clamp-2 text-sm font-medium">{material.title}</p><button disabled={busy || documents.some((d) => d.sourceMaterialId === material.id)} onClick={() => linkMaterial(material.id)} className="mt-2 text-xs font-semibold text-violet-400">{documents.some((d) => d.sourceMaterialId === material.id) ? "Linked" : "Add to lesson"}</button></div>)}{!materials.length && <p className="text-xs text-ink/45">Search by a course, title, or topic.</p>}</div></section>
          </aside>
        </div>
      </>}
    </main>
  </>;
}
