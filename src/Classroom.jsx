import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "./Navbar";
import { apiDelete, apiGet, apiPatch, apiPost, apiPostForm } from "./api";
import Dialog from "./classroom/Dialog";
import LessonView from "./classroom/LessonView";
import Md from "./classroom/Markdown";
import OutlinePanel from "./classroom/OutlinePanel";
import BoardPanel from "./classroom/BoardPanel";
import BoardPrint from "./classroom/BoardPrint";
import { blockSummary, normalizeBlock } from "./classroom/boardHelpers";
import { boardFilename, boardToMarkdown, downloadText } from "./classroom/boardExport";
import PageNav from "./classroom/PageNav";
import SetupWizard from "./classroom/SetupWizard";
import { buildBoard, pageIndexOf, readEvents } from "./classroom/lessonEvents";
import useLessonVoice from "./classroom/useLessonVoice";
import useSpeechInput from "./classroom/useSpeechInput";
import { appendDictation } from "./classroom/speechInput";
import VoiceBar from "./classroom/VoiceBar";
import { tutorState } from "./classroom/tutorState";
import { browserStorage, loadVoicePrefs, saveVoicePrefs } from "./classroom/voicePrefs";
import { DOC_STATUS, MODE_LABEL, currentStep, describeError, readObjectives, readOutline, shouldKeepRequestKey, sleep, isScan, pickDocuments, truncationNote } from "./classroom/classroomUtils";

const card = "rounded-2xl border border-ink/10 bg-bg-elevated p-5 shadow-sm";
const primary = "rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50";
const secondary = "rounded-lg border border-ink/10 px-3 py-2 text-sm transition hover:bg-ink/5 disabled:opacity-50";
const REPLY_POLL_MS = 2500;
const REPLY_WAIT_MS = 90_000;

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function ErrorLine({ children }) {
  return children ? <p role="alert" className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{children}</p> : null;
}

function RenameForm({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) onSave(title.trim()); }}>
      <h2 id="rename-title" className="text-lg font-bold">Rename lesson</h2>
      <label htmlFor="rename-input" className="sr-only">Lesson title</label>
      <input id="rename-input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} className="mt-3 w-full rounded-xl border border-ink/10 bg-bg px-4 py-3 outline-none focus:border-violet-500" />
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={secondary}>Cancel</button>
        <button disabled={!title.trim()} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save</button>
      </div>
    </form>
  );
}

function PreparePlan({ session, readyDocs, processingDocs, planning, onPrepare }) {
  const usesNotes = session.sourceMode !== "GENERAL";
  const noNotes = usesNotes && readyDocs === 0;
  const hint = processingDocs > 0
    ? `Waiting for ${plural(processingDocs, "document")} to finish processing…`
    : readyDocs > 0
      ? `${plural(readyDocs, "document")} ready. The plan will follow ${readyDocs === 1 ? "it" : "them"}.`
      : "Add your notes on the right first so the plan follows them, or prepare it without notes.";
  return (
    <div className="px-2 py-10 text-center sm:px-8">
      <h2 className="text-xl font-bold">Prepare your lesson</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/60">
        The tutor drafts objectives and a step-by-step outline for “{session.topic}”, then teaches one step at a time. This uses 1 of your daily tutor turns.
      </p>
      {usesNotes && <p role="status" className="mx-auto mt-3 max-w-md rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">{hint}</p>}
      <button onClick={onPrepare} disabled={planning || processingDocs > 0} className={`${primary} mt-5`}>
        {planning ? "Preparing your lesson…" : noNotes ? "Prepare without notes" : "Prepare lesson plan"}
      </button>
      {planning && <p role="status" className="mt-3 text-xs text-ink/50">This can take up to a minute.</p>}
    </div>
  );
}

function progressText(item) {
  if (item.mode !== "CLASSROOM") return null;
  const total = readOutline(item).length;
  return total ? `Step ${currentStep(item, total) + 1} of ${total}` : "Plan not prepared";
}

function ClassroomInner({ sessionId }) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [session, setSession] = useState(null);
  const [turns, setTurns] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [materialSearch, setMaterialSearch] = useState("");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  // Documents the student switched off for tutor answers. Empty means every ready document is used.
  const [excluded, setExcluded] = useState([]);
  // The idempotency key of a send whose outcome we don't know yet, so a retry can't be charged as a second turn.
  const pendingSend = useRef(null);
  const alive = useRef(true);
  const listRef = useRef(null);
  // Which board page is showing. It follows the newest page until the student picks one, and a new page resets it.
  const [pageChoice, setPageChoice] = useState({ count: 0, index: null });
  // On small screens the board and the lesson take turns; on large screens both are shown.
  const [view, setView] = useState("lesson");
  // The whiteboard block the next question is about ({ turnId, eventId, label }), and whether the print view is open.
  const [askAbout, setAskAbout] = useState(null);
  const [printing, setPrinting] = useState(false);
  const questionInput = useRef(null);
  // Voice (Phase E): settings live in this browser; playback follows the latest tutor reply.
  const [voicePrefs, setVoicePrefs] = useState(() => loadVoicePrefs(browserStorage()));
  const pagesRef = useRef([]);
  const playingTurn = useRef(null);
  const seenReply = useRef(undefined); // undefined until the lesson has loaded, so opening a lesson never starts speaking
  const voice = useLessonVoice({
    rate: voicePrefs.rate,
    voiceName: voicePrefs.voiceName,
    gender: session?.tutorVoice,
    // As the tutor starts a board page, turn the whiteboard to it.
    onEvent: (event) => {
      if (event.type !== "BOARD_PAGE") return;
      const index = pageIndexOf(pagesRef.current, playingTurn.current, event.id);
      if (index >= 0) setPageChoice({ count: pagesRef.current.length, index });
    },
  });
  // Dictation fills the question box (the student reads it and presses Send); starting it silences the tutor.
  const speechInput = useSpeechInput({
    onStart: () => voice.controls.stop(),
    onText: (words) => setQuestion((current) => appendDictation(current, words)),
  });
  function changeVoicePrefs(patch) {
    setVoicePrefs((current) => { const next = { ...current, ...patch }; saveVoicePrefs(browserStorage(), next); return next; });
  }

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const loadDashboard = useCallback(async () => {
    try { const list = await apiGet("/classroom/sessions"); if (alive.current) setSessions(list); }
    catch (e) { if (alive.current) setError(describeError(e, "Could not load your lessons.")); }
    finally { if (alive.current) setLoading(false); }
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const [current, history, docs] = await Promise.all([
        apiGet(`/classroom/sessions/${sessionId}`),
        apiGet(`/classroom/sessions/${sessionId}/turns?limit=100`),
        apiGet(`/classroom/sessions/${sessionId}/documents`),
      ]);
      if (!alive.current) return;
      setSession(current); setTurns(history); setDocuments(docs);
    } catch (e) { if (alive.current) setError(describeError(e, "Could not load this classroom.")); }
    finally { if (alive.current) setLoading(false); }
  }, [sessionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { if (sessionId) void loadSession(); else void loadDashboard(); }, 0);
    return () => window.clearTimeout(timer);
  }, [sessionId, loadSession, loadDashboard]);

  // While a document is processing, check back so it flips to Ready without a page refresh.
  const hasProcessing = documents.some((doc) => doc.status === "PROCESSING");
  useEffect(() => {
    if (!sessionId || !hasProcessing) return undefined;
    const timer = window.setInterval(async () => {
      try { const docs = await apiGet(`/classroom/sessions/${sessionId}/documents`); if (alive.current) setDocuments(docs); }
      catch { /* try again on the next tick */ }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [sessionId, hasProcessing]);

  const refreshLesson = useCallback(async () => {
    const [history, current] = await Promise.all([
      apiGet(`/classroom/sessions/${sessionId}/turns?limit=100`),
      apiGet(`/classroom/sessions/${sessionId}`),
    ]);
    if (!alive.current) return;
    setTurns(history); setSession(current);
  }, [sessionId]);

  const refreshDocuments = useCallback(async () => {
    const docs = await apiGet(`/classroom/sessions/${sessionId}/documents`);
    if (alive.current) setDocuments(docs);
  }, [sessionId]);

  function scrollToEnd() {
    window.requestAnimationFrame(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; });
  }

  async function createSession(values) {
    setBusy(true); setError("");
    try {
      const created = await apiPost("/classroom/sessions", { ...values, title: values.topic });
      navigate(`/classroom/${created.id}`);
    } catch (err) { setError(describeError(err, "Could not create a lesson.")); setBusy(false); }
  }

  async function preparePlan() {
    if (planning) return;
    setPlanning(true); setError("");
    try {
      const updated = await apiPost(`/classroom/sessions/${sessionId}/plan`, {});
      if (alive.current) setSession(updated);
    } catch (err) { setError(describeError(err, "Could not prepare the lesson plan.", { tutor: true })); }
    finally { if (alive.current) setPlanning(false); }
  }

  // A reply that is still being prepared (for example after a retry) is polled until it finishes or we give up.
  async function waitForReply(first) {
    let result = first;
    const startedAt = Date.now();
    while (result?.request?.status === "PROCESSING" && alive.current && Date.now() - startedAt < REPLY_WAIT_MS) {
      await sleep(REPLY_POLL_MS);
      result = await apiGet(`/classroom/sessions/${sessionId}/turn-requests/${result.request.id}`);
    }
    return result;
  }

  function toggleDocument(id) {
    setExcluded((current) => {
      if (current.includes(id)) return current.filter((other) => other !== id);
      // Keep at least one document on.
      return pickDocuments(documents, current).ids.length <= 1 ? current : [...current, id];
    });
  }

  async function sendTurn(message, action = "ASK", boardRef = null) {
    const text = message.trim();
    if (!text || sending) return false;
    voice.controls.stop(); // the tutor stops talking when the student speaks up
    const { ids, narrowed } = pickDocuments(documents, excluded);
    // The selection is part of the request, so changing it is a new send (new key), while retrying the same one reuses the key.
    const signature = `${action}\n${text}\n${narrowed ? ids.join(",") : ""}\n${boardRef ? `${boardRef.turnId}:${boardRef.eventId}` : ""}`;
    if (pendingSend.current?.signature !== signature) pendingSend.current = { signature, key: crypto.randomUUID() };
    setSending(true); setError("");
    try {
      const first = await apiPost(`/classroom/sessions/${sessionId}/turns`, {
        message: text, idempotencyKey: pendingSend.current.key, ...(action === "ASK" ? {} : { action }), ...(narrowed ? { documentIds: ids } : {}), ...(boardRef && action === "ASK" ? { boardRef: { turnId: boardRef.turnId, eventId: boardRef.eventId } } : {}),
      });
      const result = await waitForReply(first);
      const status = result?.request?.status;
      if (status === "COMPLETED") { pendingSend.current = null; await refreshLesson(); scrollToEnd(); return true; }
      if (status === "FAILED") {
        pendingSend.current = null; await refreshLesson();
        setError("The tutor couldn't answer that. Please try again.");
        return false;
      }
      setError("The tutor is still preparing a reply. Try again in a moment; it won't use another turn.");
      return false;
    } catch (err) {
      const keep = shouldKeepRequestKey(err);
      if (!keep) pendingSend.current = null;
      const base = describeError(err, "The tutor could not respond.", { tutor: true });
      setError(keep ? `${base} Your message is saved: try again and it won't use another turn.` : base);
      return false;
    } finally { if (alive.current) setSending(false); }
  }

  function askAboutBlock(block) {
    const clean = normalizeBlock(block);
    if (!clean?.turnId || !clean.eventId) return;
    setAskAbout({ turnId: clean.turnId, eventId: clean.eventId, label: blockSummary(clean) });
    setView("lesson");
    // The lesson column may have been hidden on a phone; focus once it is showing.
    window.setTimeout(() => questionInput.current?.focus(), 0);
  }

  const boardTitle = session?.title || session?.topic || "";
  function downloadBoard() {
    const markdown = boardToMarkdown(boardPages, { title: boardTitle });
    if (markdown) downloadText(boardFilename(boardTitle), markdown);
  }

  async function submitQuestion(e) {
    e.preventDefault();
    speechInput.cancel();
    if (await sendTurn(question, "ASK", askAbout)) { setQuestion(""); setAskAbout(null); }
  }

  async function uploadDocument(e) {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    setBusy(true); setError("");
    try {
      const data = new FormData(); data.append("file", file);
      await apiPostForm(`/classroom/sessions/${sessionId}/documents`, data);
      await refreshDocuments();
    } catch (err) { setError(describeError(err, "Could not process this document.")); }
    finally { setBusy(false); }
  }

  async function linkMaterial(materialId) {
    setBusy(true); setError("");
    try {
      await apiPost(`/classroom/sessions/${sessionId}/materials`, { materialId });
      await refreshDocuments();
    } catch (err) { setError(describeError(err, "Could not link this material.")); }
    finally { setBusy(false); }
  }

  async function removeDocument(id) {
    setBusy(true); setError("");
    try {
      const result = await apiDelete(`/classroom/sessions/${sessionId}/documents/${id}`);
      await refreshDocuments();
      if (result.status === "DELETE_FAILED") setError("Storage deletion failed. The file is hidden from lessons; retry removal from the document list.");
    } catch (err) { setError(describeError(err, "Deletion is pending. Retry from the document list.")); }
    finally { setBusy(false); }
  }

  async function retryDocument(id) {
    setBusy(true); setError("");
    try {
      await apiPost(`/classroom/sessions/${sessionId}/documents/${id}/retry`, {});
      await refreshDocuments();
    } catch (err) { setError(describeError(err, "Could not retry document processing.")); }
    finally { setBusy(false); }
  }

  async function searchMaterials(e) {
    e.preventDefault(); if (!materialSearch.trim()) return;
    setBusy(true); setError("");
    try {
      const result = await apiGet(`/study-material?search=${encodeURIComponent(materialSearch.trim())}`);
      setMaterials(Array.isArray(result) ? result : []);
    } catch (err) { setError(describeError(err, "Could not search UniLib materials.")); }
    finally { setBusy(false); }
  }

  async function saveTitle(title) {
    try { setSession(await apiPatch(`/classroom/sessions/${sessionId}`, { title })); setDialog(null); }
    catch (err) { setDialog(null); setError(describeError(err, "Could not update lesson.")); }
  }

  async function deleteSession() {
    setBusy(true); setError("");
    try {
      const result = await apiDelete(`/classroom/sessions/${sessionId}`);
      if (result.status === "DELETE_FAILED") throw new Error("Some files could not be deleted. Reopen the lesson and retry deletion.");
      navigate("/classroom");
    } catch (err) { setDialog(null); setError(describeError(err, "Could not delete this lesson.")); }
    finally { setBusy(false); }
  }

  // Whiteboard pages rebuilt from the stored lesson events, so they are the same after a reload.
  const boardPages = buildBoard(turns);
  const hasBoard = boardPages.length > 0;
  const latestReply = [...turns].reverse().find((turn) => turn.role === "TUTOR");
  const replyEvents = readEvents(latestReply?.structuredLesson);
  const { play: playReply } = voice.controls;
  useEffect(() => {
    pagesRef.current = boardPages;
    if (loading) return;
    const id = latestReply?.id ?? null;
    if (seenReply.current === undefined) { seenReply.current = id; return; }
    if (id === seenReply.current) return;
    seenReply.current = id;
    if (id && voicePrefs.autoSpeak && voice.supported && replyEvents.length) { playingTurn.current = id; playReply(replyEvents); }
  });
  const listen = () => { if (!latestReply || !replyEvents.length) return; playingTurn.current = latestReply.id; playReply(replyEvents); };
  const caption = voice.event?.type === "SAY" ? voice.event.text : voice.event?.type === "CHECK" ? voice.event.question : "";
  const pageIndex = pageChoice.count === boardPages.length && pageChoice.index !== null ? Math.min(pageChoice.index, boardPages.length - 1) : boardPages.length - 1;
  const outline = readOutline(session);
  const objectives = readObjectives(session);
  const hasPlan = outline.length > 0;
  const isClassroom = session?.mode === "CLASSROOM";
  const needsPlan = isClassroom && !hasPlan;
  const started = turns.some((turn) => turn.role === "TUTOR");
  const current = currentStep(session, outline.length);
  const atLastStep = hasPlan && current >= outline.length - 1;
  const readyDocs = documents.filter((doc) => doc.status === "READY").length;
  const selection = pickDocuments(documents, excluded);
  const choosingDocs = selection.ready.length > 1;
  const processingDocs = documents.filter((doc) => doc.status === "PROCESSING").length;
  const showPlanCard = needsPlan && !turns.length && !loading;
  const labelFor = (lesson) => {
    const index = lesson?.stepIndex;
    return hasPlan && Number.isInteger(index) && outline[index] ? `Step ${index + 1} of ${outline.length} · ${outline[index].title}` : "";
  };

  return <>
    <Navbar />
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-16 pt-36 text-ink sm:px-6">
      {!sessionId ? <>
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">UniLib learning</p>
          <h1 className="mt-2 text-3xl font-black">AI Classroom</h1>
          <p className="mt-2 max-w-xl text-sm text-ink/55">Start a guided lesson, attach your notes, and return to saved lessons whenever you’re ready.</p>
        </header>
        <section className={`${card} mb-8`} aria-labelledby="new-lesson">
          <h2 id="new-lesson" className="mb-4 text-lg font-bold">Start a lesson</h2>
          <SetupWizard onCreate={createSession} busy={busy} />
          <ErrorLine>{error}</ErrorLine>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold">Your lessons</h2>
          {loading ? <p className="text-sm text-ink/50">Loading lessons…</p> : sessions.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sessions.map((item) => (
                <button key={item.id} onClick={() => navigate(`/classroom/${item.id}`)} className={`${card} text-left transition hover:border-violet-500/40`}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold">{item.title || item.topic}</h3>
                    <span className="shrink-0 rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">{MODE_LABEL[item.mode] ?? MODE_LABEL.CONVERSATION}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink/55">{item.topic}</p>
                  <p className="mt-3 text-xs text-ink/50">
                    {[progressText(item), `${item._count?.turns || 0} messages`, `Updated ${new Date(item.updatedAt).toLocaleDateString()}`].filter(Boolean).join(" · ")}
                  </p>
                </button>
              ))}
            </div>
          ) : <div className={card}><p className="text-sm text-ink/55">No saved lessons yet. Start with a topic above.</p></div>}
          {!sessions.length && !loading && <ErrorLine>{error}</ErrorLine>}
        </section>
      </> : <>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <button onClick={() => navigate("/classroom")} className="text-sm text-violet-600 dark:text-violet-400">← All lessons</button>
            <h1 className="mt-2 text-2xl font-black">{session?.title || session?.topic || "AI Classroom"}</h1>
            <p className="text-sm text-ink/50">{session?.topic}{session ? ` · ${MODE_LABEL[session.mode] ?? MODE_LABEL.CONVERSATION}` : ""}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDialog("rename")} disabled={!session} className={secondary}>Rename</button>
            <button onClick={() => setDialog("delete")} disabled={busy || !session} className="rounded-lg border border-red-500/20 px-3 py-2 text-sm text-red-600 transition hover:bg-red-500/5 disabled:opacity-50 dark:text-red-400">Delete lesson</button>
          </div>
        </div>
        <ErrorLine>{error}</ErrorLine>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
          <PageNav pages={boardPages} index={pageIndex} onChange={(index) => setPageChoice({ count: boardPages.length, index })} />
          {hasBoard && (
            <div role="group" aria-label="Show" className="grid grid-cols-2 gap-1 rounded-xl bg-ink/5 p-1 text-sm font-semibold lg:hidden">
              {[["lesson", "Lesson"], ["board", "Board"]].map(([id, label]) => (
                <button key={id} type="button" onClick={() => setView(id)} aria-pressed={view === id} className={`rounded-lg px-3 py-1.5 transition focus-visible:outline-2 focus-visible:outline-violet-500 ${view === id ? "bg-bg-elevated text-ink shadow-sm" : "text-ink/60"}`}>{label}</button>
              ))}
            </div>
          )}
          {hasBoard && <div className={view === "board" ? "" : "hidden lg:block"}><BoardPanel page={boardPages[pageIndex]} onAsk={askAboutBlock} onDownload={downloadBoard} onPrint={() => setPrinting(true)} /></div>}
          <section className={`${card} flex min-h-[60vh] flex-col ${hasBoard && view === "board" ? "hidden lg:flex" : ""}`} aria-label="Lesson">
            {hasPlan && (
              <p className="mb-3 rounded-xl bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-800 dark:text-violet-200 lg:hidden">
                {started ? `Step ${current + 1} of ${outline.length}: ${outline[current].title}` : `${plural(outline.length, "step")} · ready to start`}
              </p>
            )}
            {showPlanCard ? (
              <PreparePlan session={session} readyDocs={readyDocs} processingDocs={processingDocs} planning={planning} onPrepare={preparePlan} />
            ) : <>
              {voice.supported && isClassroom && started && replyEvents.length > 0 && (
                <VoiceBar
                  state={tutorState({ sending, listening: speechInput.listening, playerStatus: voice.player.status, speaking: voice.speaking })}
                  status={voice.player.status} caption={caption} error={voice.error} canListen={!sending}
                  rate={voicePrefs.rate} onRate={(rate) => changeVoicePrefs({ rate })}
                  voices={voice.voices} voice={voice.voice} voiceName={voicePrefs.voiceName} onVoice={(voiceName) => changeVoicePrefs({ voiceName })}
                  autoSpeak={voicePrefs.autoSpeak} onAutoSpeak={(autoSpeak) => changeVoicePrefs({ autoSpeak })}
                  controls={voice.controls} onListen={listen}
                />
              )}
              <div ref={listRef} className="mb-4 max-h-[60vh] min-h-[30vh] flex-1 space-y-5 overflow-y-auto pr-1">
                {loading ? <p className="text-sm text-ink/50">Loading lesson…</p> : turns.length ? turns.map((turn) => (
                  <article key={turn.id} id={`turn-${turn.id}`} className={`scroll-mt-2 rounded-2xl p-4 ${turn.role === "STUDENT" ? "ml-8 bg-violet-500/10" : "mr-4 bg-ink/[0.035]"}`}>
                    <p className="text-xs font-bold uppercase tracking-wider text-ink/50">{turn.role === "STUDENT" ? "You" : "UniLib Tutor"}</p>
                    {turn.role === "TUTOR"
                      ? (turn.structuredLesson
                        ? <LessonView lesson={turn.structuredLesson} label={labelFor(turn.structuredLesson)} showOrigins={turn.structuredLesson.schemaVersion === 2 && session?.sourceMode !== "GENERAL"} />
                        : <Md className="mt-2">{turn.content}</Md>)
                      : <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{turn.content}</p>}
                  </article>
                )) : (
                  <div className="py-12 text-center">
                    <p className="text-lg font-semibold">{hasPlan ? "Your lesson is ready" : "Your lesson starts here"}</p>
                    <p className="mt-2 text-sm text-ink/55">{hasPlan ? `It starts with “${outline[current].title}”.` : "Ask for a step-by-step explanation or attach lecture notes."}</p>
                    {hasPlan && <button onClick={() => sendTurn("Start the lesson.")} disabled={sending} className={`${primary} mt-5`}>Start lesson</button>}
                  </div>
                )}
                {sending && (
                  <div role="status" className="mr-4 rounded-2xl bg-ink/[0.035] p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-ink/50">UniLib Tutor</p>
                    <p className="mt-2 text-sm text-ink/60 motion-safe:animate-pulse">Preparing a reply…</p>
                  </div>
                )}
              </div>
              {isClassroom && hasPlan && started && (
                <div className="mb-3">
                  <button onClick={() => sendTurn(atLastStep ? "Recap and wrap up the lesson." : "Continue to the next step.", "CONTINUE")} disabled={sending} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50">
                    {atLastStep ? "Recap and finish" : "Continue to next step"}
                  </button>
                </div>
              )}
              {processingDocs > 0 && (
                <p role="status" className="mb-2 text-xs text-amber-800 dark:text-amber-300">
                  {plural(processingDocs, "document")} still processing. The tutor won’t use {processingDocs === 1 ? "it" : "them"} until {processingDocs === 1 ? "it’s" : "they’re"} ready.
                </p>
              )}
              {askAbout && (
                <p className="mb-2 flex items-center gap-2 rounded-xl bg-violet-500/10 px-3 py-1.5 text-xs text-violet-900 dark:text-violet-100">
                  <span className="min-w-0 flex-1 truncate">Asking about: {askAbout.label}</span>
                  <button type="button" onClick={() => setAskAbout(null)} aria-label="Stop asking about this whiteboard item" className="rounded p-0.5 hover:bg-violet-500/20 focus-visible:outline-2 focus-visible:outline-violet-500"><X aria-hidden="true" className="h-3.5 w-3.5" /></button>
                </p>
              )}
              <form onSubmit={submitQuestion} className="flex gap-2 border-t border-ink/10 pt-4">
                <input ref={questionInput} aria-label="Ask your tutor a question" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={4000} placeholder="Ask your tutor a question…" className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-bg px-4 py-3 outline-none focus:border-violet-500" />
                {speechInput.supported && (
                  <button type="button" onClick={speechInput.listening ? speechInput.stop : speechInput.start} disabled={sending} aria-pressed={speechInput.listening}
                    aria-label={speechInput.listening ? "Stop voice input" : "Ask with your voice"} title={speechInput.listening ? "Stop voice input" : "Ask with your voice"}
                    className={`inline-flex w-12 items-center justify-center rounded-xl border transition focus-visible:outline-2 focus-visible:outline-violet-500 disabled:opacity-50 ${speechInput.listening ? "border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-200 motion-safe:animate-pulse" : "border-ink/10 hover:bg-ink/5"}`}>
                    {speechInput.listening ? <Square aria-hidden="true" className="h-4 w-4" /> : <Mic aria-hidden="true" className="h-5 w-5" />}
                  </button>
                )}
                <button disabled={sending || !question.trim()} className="rounded-xl bg-violet-600 px-5 font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50">{sending ? "…" : "Send"}</button>
              </form>
              {speechInput.listening && <p role="status" className="mt-2 text-xs text-ink/60">Listening{speechInput.interim ? `: ${speechInput.interim}` : "…"}</p>}
              {speechInput.error && <p role="alert" className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">{speechInput.error}</p>}
              {speechInput.supported && !speechInput.listening && !speechInput.error && <p className="mt-2 text-xs text-ink/45">Voice input uses your browser’s speech service, which may send your audio to the browser’s provider.</p>}
            </>}
          </section>
          </div>

          <aside className="space-y-4">
            {hasPlan && <OutlinePanel objectives={objectives} outline={outline} current={current} started={started} />}
            <section className={card}>
              <h2 className="font-bold">Class materials</h2>
              <label className="mt-3 block cursor-pointer rounded-xl border border-dashed border-violet-500/30 p-4 text-center text-sm text-violet-700 transition hover:bg-violet-500/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500 dark:text-violet-300">
                Upload PDF, DOCX, TXT, or image
                <input type="file" accept="application/pdf,.pdf,.docx,.txt,image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={uploadDocument} />
              </label>
              <div className="mt-3 space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-start justify-between gap-2 rounded-xl bg-ink/[0.035] p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{doc.originalName}</p>
                      <p className="text-xs text-ink/55">
                        {DOC_STATUS[doc.status] ?? doc.status}
                        {doc.extractedChars && !(doc.truncated && doc.totalChars) ? ` · ${doc.extractedChars.toLocaleString()} chars` : ""}
                        {doc.truncated ? ` · ${truncationNote(doc)}` : ""}
                      </p>
                      {doc.status === "READY" && isScan(doc) && (
                        <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">Read from a scan. Equations and handwriting may be misread.</p>
                      )}
                      {choosingDocs && doc.status === "READY" && (
                        <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs text-ink/65 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500">
                          <input
                            type="checkbox" className="h-4 w-4 accent-violet-600"
                            checked={selection.ids.includes(doc.id)}
                            disabled={selection.ids.length === 1 && selection.ids.includes(doc.id)}
                            onChange={() => toggleDocument(doc.id)}
                          />
                          Use in lesson
                        </label>
                      )}
                      {["FAILED", "DELETE_FAILED", "DELETE_PENDING"].includes(doc.status) && (
                        <button disabled={busy} onClick={() => retryDocument(doc.id)} className="mt-1 text-xs font-semibold text-amber-800 dark:text-amber-300">{doc.status === "FAILED" ? "Retry processing" : "Retry deletion"}</button>
                      )}
                    </div>
                    <button disabled={busy} onClick={() => removeDocument(doc.id)} className="text-xs text-red-600 dark:text-red-400">Remove</button>
                  </div>
                ))}
              </div>
              {choosingDocs && <p className="mt-2 text-xs text-ink/50">The tutor answers from the ticked documents. The lesson plan is built from all of them.</p>}
            </section>
            <section className={card}>
              <h2 className="font-bold">Link UniLib material</h2>
              <p className="mt-1 text-xs text-ink/55">Only materials you can access are accepted.</p>
              <form onSubmit={searchMaterials} className="mt-3 flex gap-2">
                <input aria-label="Search UniLib materials" value={materialSearch} onChange={(e) => setMaterialSearch(e.target.value)} maxLength={100} placeholder="Search materials" className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-bg px-3 py-2 text-sm" />
                <button disabled={busy} className="rounded-lg bg-violet-600 px-3 text-sm text-white disabled:opacity-50">Find</button>
              </form>
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                {materials.slice(0, 30).map((material) => {
                  const linked = documents.some((doc) => doc.sourceMaterialId === material.id);
                  return (
                    <div key={material.id} className="rounded-xl border border-ink/5 p-3">
                      <p className="line-clamp-2 text-sm font-medium">{material.title}</p>
                      <button disabled={busy || linked} onClick={() => linkMaterial(material.id)} className="mt-2 text-xs font-semibold text-violet-700 dark:text-violet-300">{linked ? "Linked" : "Add to lesson"}</button>
                    </div>
                  );
                })}
                {!materials.length && <p className="text-xs text-ink/55">Search by a course, title, or topic.</p>}
              </div>
            </section>
          </aside>
        </div>
      </>}
    </main>

    {printing && <BoardPrint pages={boardPages} title={boardTitle} onDone={() => setPrinting(false)} />}
    <Dialog open={dialog === "rename"} onClose={() => setDialog(null)} labelledBy="rename-title">
      <RenameForm initial={session?.title || ""} onSave={saveTitle} onCancel={() => setDialog(null)} />
    </Dialog>
    <Dialog open={dialog === "delete"} onClose={() => setDialog(null)} labelledBy="delete-title">
      <h2 id="delete-title" className="text-lg font-bold">Delete this lesson?</h2>
      <p className="mt-2 text-sm text-ink/65">This removes the lesson, its messages and any documents you uploaded to it. It can’t be undone.</p>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={() => setDialog(null)} disabled={busy} className={secondary}>Cancel</button>
        <button onClick={deleteSession} disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Deleting…" : "Delete lesson"}</button>
      </div>
    </Dialog>
  </>;
}

export default function Classroom() {
  const { sessionId } = useParams();
  // Keyed by the lesson, so moving between lessons (or back to the list) starts from a clean slate.
  return <ClassroomInner key={sessionId || "dashboard"} sessionId={sessionId} />;
}
