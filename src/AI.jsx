import { getAccessToken } from "./token";
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { auth } from "./firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faBook,
  faRobot,
  faComments,
  faStore,
  faPaperPlane,
  faMicrophone,
  faMicrophoneSlash,
  faCamera,
  faPaperclip,
  faStop,
  faCopy,
  faCheck,
  faVolumeHigh,
  faVolumeMute,
  faSpinner,
  faCircleCheck,
  faTriangleExclamation,
  faXmark,
  faImage,
  faFilePdf,
  faFileWord,
  faFilePowerpoint,
  faFile,
  faChevronDown,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { apiGet, apiPost } from "./api";
import "katex/dist/katex.min.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function fetchAIWithFile(endpoint, fields, file) {
  const token = getAccessToken();

  const formData = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== null && v !== undefined) formData.append(k, String(v));
  });
  if (file) formData.append("file", file);

  const res = await fetch(`${API_URL}/ai/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || `Request failed (${res.status})`);
  }

  return res.json();
}
const CONTENT_TYPE_LABELS = {
  LECTURE_TEXT: "Lecture Notes",
  EXAM_QUESTION: "Exam Question",
  MATH_QUESTION: "Math Problem",
  DIAGRAM: "Diagram",
  MULTIPLE_QUESTIONS: "Multiple Questions",
  MESSY_NOTES: "Messy Notes",
  TEXTBOOK_PAGE: "Textbook Page",
  UNKNOWN: "Unclear",
};

async function askUniLibImage(image, question) {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append("image", image);
  if (question?.trim()) formData.append("question", question.trim());

  const res = await fetch(`${API_URL}/ai/ask-image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || "Request failed");
  }
  return res.json();
}
function normalizeMathDelimiters(text) {
  if (!text) return text;
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `$${inner}$`);
}

function ConfidenceBadge({ contentType, confidence }) {
  const label = CONTENT_TYPE_LABELS[contentType] || CONTENT_TYPE_LABELS.UNKNOWN;
  const tone =
    confidence >= 80
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400"
      : confidence >= 50
      ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
      : "border-ink/15 bg-white/5 text-ink/40";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${tone}`}>
      {label}
      {typeof confidence === "number" && <span className="opacity-70">· {confidence}%</span>}
    </span>
  );
}

// Moved outside all components — fixes the "impure function during render" error
function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

//Moved outside all components
async function logActivity(type, description, href) {
  try {
    const token = getAccessToken();
    await fetch(`${API_URL}/users/me/activity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type, description, href }),
    });
  } catch {
    // non-critical, don't throw
  }
}

function fileIcon(type) {
  if (!type) return faFile;
  if (type.startsWith("image/")) return faImage;
  if (type === "application/pdf") return faFilePdf;
  if (type.includes("word")) return faFileWord;
  if (type.includes("presentation") || type.includes("powerpoint")) return faFilePowerpoint;
  return faFile;
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1;
  utt.pitch = 1;
  window.speechSynthesis.speak(utt);
}

function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

const TAB_LINKS = [
  { href: "/home", label: "Home", icon: faHouse },
  { href: "/study-material", label: "Study", icon: faBook },
  { href: "/ai", label: "AI", icon: faRobot },
  { href: "/chat", label: "Chat", icon: faComments },
  { href: "/marketplace", label: "Market", icon: faStore },
];

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ label = "TESTYOURSELF AI is thinking…" }) {
  return (
    <div className="flex items-center gap-2 text-violet-400 text-sm">
      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
      {label}
    </div>
  );
}

// ─── File Preview Chip ────────────────────────────────────────────────────────
function FileChip({ file, onRemove }) {
  return (
    <div className="inline-flex items-center gap-2 bg-violet-500/15 border border-violet-500/30 rounded-xl px-3 py-1.5 text-xs text-violet-300 max-w-[200px]">
      <FontAwesomeIcon icon={fileIcon(file.type)} className="shrink-0" />
      <span className="truncate">{file.name}</span>
      {onRemove && (
        <button onClick={onRemove} className="shrink-0 hover:text-pink-400 transition">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      )}
    </div>
  );
}

// ─── Camera Modal ─────────────────────────────────────────────────────────────
function CameraModal({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreaming(true);
      })
      .catch(() => setError("Camera access denied."));
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  function capture() {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const file = new File([blob], `snap-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(file);
    }, "image/jpeg", 0.9);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-bg-elevated border border-ink/10 rounded-3xl overflow-hidden w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink/5">
          <span className="text-sm font-semibold text-ink">Take a Snap</span>
          <button onClick={onClose} className="text-ink/40 hover:text-ink transition">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="relative bg-black aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-pink-400 text-sm">
              <FontAwesomeIcon icon={faTriangleExclamation} className="mr-2" />
              {error}
            </div>
          )}
        </div>
        <div className="flex gap-3 px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl border border-ink/10 text-ink/50 text-sm hover:border-ink/20 transition"
          >
            Cancel
          </button>
          <button
            onClick={capture}
            disabled={!streaming}
            className="flex-1 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-ink rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faCamera} />
            Capture
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Quiz Tab ─────────────────────────────────────────────────────────────────
function QuizTab() {
  const [mode, setMode] = useState("text"); // "text" | "upload" | "scan" | "library"
  const [text, setText] = useState("");
  const [count, setCount] = useState("5");
  const [difficulty, setDifficulty] = useState("Medium");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); 

// File / camera state
  const [file, setFile] = useState(null);
  const [showCamera, setShowCamera] = useState(false);

  // Library state
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null); // full material object

const fileInputRef = useRef(null);

// Load library materials when mode switches to "library"
useEffect(() => {
  if (mode !== "library" || materials.length > 0) return;
  let cancelled = false;

  (async () => {
    setMaterialsLoading(true);
    try {
      const data = await apiGet("/study-material");
      if (cancelled) return;
      // Only show PDFs
      const pdfs = data.filter(
        (m) => m.fileType === "application/pdf" || m.fileType === "pdf"
      );
      setMaterials(pdfs);
    } catch (err) {
      if (!cancelled) setMaterials([]);
    } finally {
      if (!cancelled) setMaterialsLoading(false);
    }
  })();

  return () => { cancelled = true; };
}, [mode, materials.length]);
  function handleFileChange(e, source) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setMode(source);
    e.target.value = "";
  }

  function handleCapture(capturedFile) {
    setFile(capturedFile);
    setMode("scan");
    setShowCamera(false);
  }

  async function generate() {
    setLoading(true);
    setError("");
    setQuestions([]);
    setAnswers({});

    try {
      let data;

      if (mode === "text") {
        if (!text.trim()) { setError("Paste some text first."); setLoading(false); return; }
        data = await fetchAIWithFile("quiz", { text, count: Number(count), difficulty }, null);

      } else if (mode === "upload" || mode === "scan") {
        if (!file) { setError("Add a file first."); setLoading(false); return; }
        data = await fetchAIWithFile("quiz", { text: "", count: Number(count), difficulty }, file);

      } else if (mode === "library") {
        if (!selectedMaterial) { setError("Select a material first."); setLoading(false); return; }
        // Use signedUrl (authenticated) if available, otherwise fall back to fileUrl
        const fileUrl = selectedMaterial.signedUrl || selectedMaterial.fileUrl;
        data = await apiPost("/ai/quiz/from-material", {
          materialId: selectedMaterial.id,
          fileUrl,
          count: Number(count),
          difficulty,
        });
      }

      setQuestions(data.questions);
    } catch {
      setError("Failed to generate quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function answer(qi, opt) {
    if (answers[qi] !== undefined) return;
    setAnswers((prev) => ({ ...prev, [qi]: opt }));
  }

  const score = questions.filter((q, i) => answers[i] === q.answer).length;
  const allDone = questions.length > 0 && Object.keys(answers).length === questions.length;

  return (
    <div className="space-y-4">
      {showCamera && (
        <CameraModal onCapture={handleCapture} onClose={() => setShowCamera(false)} />
      )}

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => handleFileChange(e, "upload")}
      />

      {/* Source mode tabs */}
      <div>
  <div className="flex items-center justify-between mb-2">
    <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase">
      Source
    </label>
    <GenerationHistory
      tool="quiz"
      onSelect={(gen) => { setQuestions(gen.result.questions); setAnswers({}); }}
    />
  </div>
  <div className="flex gap-2 flex-wrap">
          {[
            { id: "text", label: "Paste Text" },
            { id: "upload", label: "Upload PDF" },
            { id: "scan", label: "Scan Notes" },
            { id: "library", label: "My Library" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => {
                if (m.id === "upload") { fileInputRef.current?.click(); return; }
                if (m.id === "scan") { setShowCamera(true); return; }
                setMode(m.id);
                setFile(null);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                mode === m.id
                  ? "bg-violet-600 text-white border-violet-500"
                  : "bg-white/5 text-ink/50 border-ink/10 hover:border-violet-500/40 hover:text-ink/80"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text input */}
      {mode === "text" && (
        <div>
          <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase mb-2">
            Paste Your Study Material
          </label>
          <textarea
            rows={5}
            placeholder="e.g. The mitochondria is the powerhouse of the cell…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-black/40 border border-ink/10 rounded-2xl px-4 py-3 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 resize-none transition"
          />
        </div>
      )}

      {/* File selected */}
      {(mode === "upload" || mode === "scan") && file && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300">
          <FontAwesomeIcon icon={mode === "scan" ? faCamera : faPaperclip} className="text-xs" />
          <span className="truncate">{file.name}</span>
          <button
            onClick={() => { setFile(null); setMode("text"); }}
            className="ml-auto text-ink/30 hover:text-ink transition"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}

      {/* Library picker */}
      {mode === "library" && (
        <div>
          <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase mb-2">
            Select a PDF
          </label>
          {materialsLoading ? (
            <Spinner label="Loading materials…" />
          ) : materials.length === 0 ? (
            <p className="text-sm text-ink/30">No PDF materials found in your library.</p>
          ) : (
            <select
              value={selectedMaterial?.id || ""}
              onChange={(e) => {
                const mat = materials.find((m) => m.id === e.target.value);
                setSelectedMaterial(mat || null);
              }}
              className="w-full bg-black/40 border border-ink/10 rounded-2xl px-3 py-2.5 text-sm text-ink/70 outline-none focus:border-violet-500/60 transition"
            >
              <option value="">Select a material…</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <select
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="flex-1 bg-black/40 border border-ink/10 rounded-2xl px-3 py-2.5 text-sm text-ink/70 outline-none focus:border-violet-500/60 transition"
        >
          <option value="3">3 questions</option>
          <option value="5">5 questions</option>
          <option value="10">10 questions</option>
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="flex-1 bg-black/40 border border-ink/10 rounded-2xl px-3 py-2.5 text-sm text-ink/70 outline-none focus:border-violet-500/60 transition"
        >
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>
        <button
          onClick={generate}
          disabled={loading}
          className="px-5 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-ink rounded-2xl text-sm font-bold transition whitespace-nowrap"
        >
          Generate
        </button>
      </div>

      {loading && <Spinner label="Generating quiz…" />}
      {error && (
        <p className="text-pink-400 text-sm flex items-center gap-2">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          {error}
        </p>
      )}

      {/* Questions */}
      {questions.map((q, qi) => (
        <div key={qi} className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4">
          <p className="text-sm font-semibold text-ink mb-3">
            {qi + 1}. {q.question}
          </p>
          <div className="space-y-2">
            {q.options.map((opt) => {
              const chosen = answers[qi] === opt;
              const revealed = answers[qi] !== undefined;
              const correct = opt === q.answer;
              return (
                <button
                  key={opt}
                  onClick={() => answer(qi, opt)}
                  disabled={revealed}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm border transition
                    ${revealed && correct
                      ? "border-emerald-400 bg-emerald-400/10 text-emerald-400"
                      : chosen && !correct
                      ? "border-pink-400 bg-pink-400/10 text-pink-400"
                      : "border-ink/10 text-ink/60 hover:border-violet-400/50 hover:text-violet-300 bg-black/20"
                    }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {answers[qi] !== undefined && (
            <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
              <FontAwesomeIcon icon={faCircleCheck} />
              Correct answer: {q.answer}
            </p>
          )}
        </div>
      ))}

      {allDone && (
        <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-ink text-center py-5 font-bold text-lg shadow-lg shadow-violet-500/20">
          Score: {score} / {questions.length}
          <p className="text-sm font-normal mt-1 text-ink/80">
            {score === questions.length
              ? "Perfect! You nailed it!"
              : score >= questions.length / 2
              ? "Good job! Keep it up!"
              : "Keep studying, you've got this!"}
          </p>
        </div>
      )}
    </div>
  );
}

function ToolModal({ tool, onClose }) {
  const TITLES = {
    quiz: "Quiz",
    explain: "Explain",
    revision: "Revision Sheet",
    practice: "Practice Problems",
    summarize: "Summarize",
    plan: "Study Plan",
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink/5 bg-bg/95 backdrop-blur-md shrink-0">
        <span className="text-sm font-bold text-ink">{TITLES[tool]}</span>
        <button onClick={onClose} className="text-ink/40 hover:text-ink transition">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">
        {tool === "quiz" && <QuizTab />}
        {tool === "explain" && <ExplainTab />}
        {tool === "revision" && <RevisionTab />}
        {tool === "practice" && <PracticeTab />}
        {tool === "summarize" && <SummarizeTab />}
        {tool === "plan" && <StudyPlanTab />}
      </div>
    </div>
  );
}

function GenerationHistory({ tool, onSelect }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    apiGet(`/ai/generations?tool=${tool}`)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [tool]);

  async function pick(id) {
    const full = await apiGet(`/ai/generations/${id}`);
    onSelect(full);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs px-3 py-1 rounded-full border border-ink/10 text-ink/40 hover:text-violet-400 hover:border-violet-500/40 transition font-medium flex items-center gap-1.5"
      >
        <FontAwesomeIcon icon={faClockRotateLeft} />
        Recent
      </button>
      {open && (
        <div className="absolute top-8 right-0 bg-bg-elevated border border-ink/10 rounded-2xl w-64 max-h-72 overflow-y-auto shadow-xl shadow-black/40 z-20">
          {loading ? (
            <div className="p-4 text-center text-violet-400"><FontAwesomeIcon icon={faSpinner} className="animate-spin" /></div>
          ) : items.length === 0 ? (
            <p className="p-4 text-xs text-ink/30 text-center">Nothing yet.</p>
          ) : (
            items.map((it) => (
              <button
                key={it.id}
                onClick={() => pick(it.id)}
                className="w-full text-left px-4 py-3 hover:bg-violet-500/10 transition border-b border-ink/5 last:border-0"
              >
                <p className="text-xs text-ink/80 truncate">{it.title || "Untitled"}</p>
                <p className="text-[10px] text-ink/30 mt-0.5">{timeAgo(it.createdAt)}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Ask AI Tab ───────────────────────────────────────────────────────────────
function AskTab({ preloadedFile, restoreChatItem, onOpenTool }) {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hi! I'm UNILIB AI. Ask me anything — type, speak, snap a photo, or upload a file!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [recording, setRecording] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [sessionId, setSessionId] = useState(null);
  const audioChunksRef = useRef([]);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [showToolPicker, setShowToolPicker] = useState(false);
  const TOOLS = [
    { id: "quiz", label: "Quiz", icon: faCircleCheck },
    { id: "explain", label: "Explain", icon: faRobot },
    { id: "revision", label: "Revision", icon: faBook },
    { id: "practice", label: "Practice", icon: faPaperclip },
    { id: "summarize", label: "Summarize", icon: faCopy },
    { id: "plan", label: "Study Plan", icon: faClockRotateLeft },
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

useEffect(() => {
  if (!restoreChatItem) return;
  if (restoreChatItem._new) {
    startNewChat();
    return;
  }
  setSessionId(restoreChatItem.id);
  setMessages(restoreChatItem.messages.map((m) => ({
    role: m.role === "user" ? "user" : "ai",
    text: m.content,
  })));
}, [restoreChatItem]);
  // Pre-load a PDF passed from the study material viewer
 useEffect(() => {
  if (!preloadedFile) return;
  queueMicrotask(() => {
    setAttachedFile(preloadedFile);
    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        text: `I've loaded "${preloadedFile.name.replace(".pdf", "")}" — ask me anything about it!`,
      },
    ]);
  });
}, [preloadedFile]);

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = "en-US";
        recognition.onresult = (e) => setInput(e.results[0][0].transcript);
        recognition.onerror = () => setInput("[Voice not recognized, please try again]");
        recognition.start();
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      alert("Microphone access denied.");
    }
  }

  function handleFileAttach(e) {
    const file = e.target.files[0];
    if (file) setAttachedFile(file);
    e.target.value = "";
  }

  function handleCapture(file) {
    setAttachedFile(file);
    setShowCamera(false);
  }

  function startNewChat() {
  stopSpeaking();
  setSessionId(null);
  setAttachedFile(null);
  setMessages([
    {
      role: "ai",
      text: "Hi! I'm UNILIB AI. Ask me anything — type, speak, snap a photo, or upload a file!",
    },
  ]);
}

async function send() {
  const msg = input.trim();
  if ((!msg && !attachedFile) || loading) return;
  setInput("");

  const fileToSend = attachedFile;
  const isImage = fileToSend?.type.startsWith("image/");
  const userMsg = { role: "user", text: msg, file: fileToSend };


  setMessages((prev) => [...prev, userMsg]);
  setAttachedFile(null);
  setLoading(true);

  try {
    let aiText, meta = null;

    if (isImage) {
      const data = await askUniLibImage(fileToSend, msg);
      aiText = data.answer;
      meta = {
        contentType: data.contentType,
        confidence: data.contentTypeConfidence,
        isUncertain: data.isUncertain,
        extractedText: data.extractedText,
      };
    } else {
      const question = msg || (
        fileToSend?.type === "application/pdf" ? "Please summarize and explain this PDF." :
        fileToSend?.type.startsWith("video/") ? "Please explain what is in this video." :
        fileToSend ? `Please analyze this file: ${fileToSend.name}` : ""
      );
      const data = await fetchAIWithFile("chat", { sessionId, question }, fileToSend);
aiText = data.answer;
if (data.sessionId) setSessionId(data.sessionId);
    }

    setMessages((prev) => [...prev, { role: "ai", text: aiText, meta }]);
    await logActivity("ai", msg.slice(0, 80) || fileToSend?.name || "AI conversation", "/ai");

    if (ttsEnabled) {
      setSpeakingIndex((prev) => {
        speak(aiText);
        return messages.length + 1;
      });
      const check = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          setSpeakingIndex(null);
          clearInterval(check);
        }
      }, 500);
    }
  } catch (err) {
    setMessages((prev) => [
      ...prev,
      { role: "ai", text: err.message || "Something went wrong. Please try again." },
    ]);
  } finally {
    setLoading(false);
  }
}

  function copyMessage(text, idx) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  function toggleSpeak(text, idx) {
    if (speakingIndex === idx) {
      stopSpeaking();
      setSpeakingIndex(null);
    } else {
      stopSpeaking();
      setSpeakingIndex(idx);
      speak(text);
      const check = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          setSpeakingIndex(null);
          clearInterval(check);
        }
      }, 500);
    }
  }

  return (
    <div className="flex flex-col h-full gap-6">
      {showCamera && <CameraModal onCapture={handleCapture} onClose={() => setShowCamera(false)} />}
{sessionId && (
  <div className="flex items-center justify-end">
    <span className="text-[10px] text-ink/20 font-mono">
      session: {sessionId.slice(0, 8)} · {messages.filter(m => m.role === "user").length} msgs
    </span>
  </div>
)}
      {/* TTS toggle */}
      <div className="flex items-center justify-end gap-2 mb-3">
        <span className="text-xs text-ink/30">Voice replies</span>
        <button
          onClick={() => {
            setTtsEnabled((v) => !v);
            if (ttsEnabled) stopSpeaking();
          }}
          className={`text-xs px-3 py-1 rounded-full border transition font-medium ${
            ttsEnabled
              ? "border-violet-500/50 text-violet-400 bg-violet-500/10"
              : "border-ink/10 text-ink/30"
          }`}
        >
          <FontAwesomeIcon icon={ttsEnabled ? faVolumeHigh : faVolumeMute} className="mr-1.5" />
          {ttsEnabled ? "On" : "Off"}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 mb-3">
  <button
    onClick={startNewChat}
    className="text-xs px-3 py-1 rounded-full border border-ink/10 text-ink/40 hover:text-violet-400 hover:border-violet-500/40 transition font-medium"
  >
    <FontAwesomeIcon icon={faComments} className="mr-1.5" />
    New Chat
  </button>

 <div className="flex items-center justify-end gap-2 mb-3">
  <span className="text-xs text-ink/30">Voice replies</span>
    <button onClick={() => { setTtsEnabled((v) => !v); if (ttsEnabled) stopSpeaking(); }} /* ...unchanged... */>
      ...
    </button>
  </div>
</div>



      {/* Messages */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "ai" && (
              <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center text-xs font-bold text-ink mr-2 mt-1 shrink-0">
                <FontAwesomeIcon icon={faRobot} className="text-[10px]" />
              </div>
            )}
            <div className="max-w-[80%] flex flex-col gap-1">
              {m.file && <FileChip file={m.file} />}
             {m.text && (
  <div
    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
      m.role === "ai"
        ? "bg-white/5 border border-ink/10 text-ink/85 rounded-tl-sm prose prose-invert prose-sm max-w-none"
        : "bg-violet-500 text-white rounded-tr-sm"
    }`}
  >
    {m.role === "ai" ? (
   <ReactMarkdown
  remarkPlugins={[remarkGfm, remarkMath]}
  rehypePlugins={[[rehypeKatex, { strict: false }]]}
>
  {normalizeMathDelimiters(m.text)}
</ReactMarkdown>
    ) : (
      m.text
    )}
  </div>
)}
                           {m.role === "ai" && m.text && (
                <div className="flex items-center gap-2 px-1">
                  <button
                    onClick={() => copyMessage(m.text, i)}
                    className="text-ink/20 hover:text-violet-400 transition text-xs"
                    title="Copy"
                  >
                    <FontAwesomeIcon icon={copiedIndex === i ? faCheck : faCopy} />
                  </button>
                  
                  <button
                    onClick={() => toggleSpeak(m.text, i)}
                    className={`transition text-xs ${
                      speakingIndex === i ? "text-violet-400" : "text-ink/20 hover:text-violet-400"
                    }`}
                    title={speakingIndex === i ? "Stop" : "Read aloud"}
                  >
                    <FontAwesomeIcon icon={speakingIndex === i ? faStop : faVolumeHigh} />
                  </button>
                 
                </div>
              )}
              {m.role === "ai" && m.meta && (
                <div className="flex flex-col gap-2 mt-1 px-1">
                  <div className="flex items-center gap-2">
                    <ConfidenceBadge contentType={m.meta.contentType} confidence={m.meta.confidence} />
                    {m.meta.isUncertain && (
                      <span className="text-[11px] text-amber-400 flex items-center gap-1">
                        <FontAwesomeIcon icon={faTriangleExclamation} />
                        Low confidence
                      </span>
                    )}
                  </div>
                  {m.meta.extractedText?.trim() && (
                    <div className="rounded-xl border border-ink/10 overflow-hidden">
                      <button
                        onClick={() => setExpandedIdx((prev) => (prev === i ? null : i))}
                        className="w-full flex items-center justify-between px-3 py-2 bg-white/[0.03] text-[11px] font-semibold text-ink/40 tracking-widest uppercase"
                      >
                        Raw Extracted Text
                        <FontAwesomeIcon icon={faChevronDown} className={`transition-transform ${expandedIdx === i ? "rotate-180" : ""}`} />
                      </button>
                      {expandedIdx === i && (
                        <div className="p-3 text-xs leading-6 text-ink/40 whitespace-pre-line bg-black/20 max-h-40 overflow-y-auto">
                          {m.meta.extractedText}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center text-xs font-bold text-ink shrink-0">
              <FontAwesomeIcon icon={faRobot} className="text-[10px]" />
            </div>
            <div className="bg-white/5 border border-ink/10 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Attached file preview */}
      {attachedFile && (
        <div className="px-1">
          <FileChip file={attachedFile} onRemove={() => setAttachedFile(null)} />
        </div>
      )}

      {/* Input bar */}
      <div className="flex flex-col gap-2 pt-2 border-t border-ink/5">
        <div className="flex items-center gap-2">
           <div className="relative">
      <button
        onClick={() => setShowToolPicker((v) => !v)}
        className="w-9 h-9 rounded-xl border border-ink/10 text-ink/40 hover:text-violet-400 hover:border-violet-500/40 flex items-center justify-center transition shrink-0"
        title="Tools"
      >
        <FontAwesomeIcon
  icon={faXmark}
  style={{ transform: showToolPicker ? "rotate(0deg)" : "rotate(45deg)" }}
  className="transition-transform"
/>
      </button>
      {showToolPicker && (
        <div className="absolute bottom-12 left-0 bg-bg-elevated border border-ink/10 rounded-2xl p-2 shadow-xl shadow-black/40 w-48 z-20">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => { onOpenTool(t.id); setShowToolPicker(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-ink/70 hover:bg-violet-500/10 hover:text-violet-300 transition text-left"
            >
              <FontAwesomeIcon icon={t.icon} className="w-4 text-violet-400" />
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
         <button
      onClick={() => setShowCamera(true)}
      className="w-9 h-9 rounded-xl border border-ink/10 text-ink/40 hover:text-violet-400 hover:border-violet-500/40 flex items-center justify-center transition shrink-0"
      title="Take a snap"
    >
      <FontAwesomeIcon icon={faCamera} />
    </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 rounded-xl border border-ink/10 text-ink/40 hover:text-violet-400 hover:border-violet-500/40 flex items-center justify-center transition shrink-0"
            title="Attach file"
          >
            <FontAwesomeIcon icon={faPaperclip} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={handleFileAttach}
          />
          <input
            type="text"
            placeholder={recording ? "Listening…" : "Ask a question…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            disabled={loading}
            className="flex-1 bg-black/40 border border-ink/10 rounded-2xl px-4 py-2.5 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 transition"
          />
          <button
            onClick={toggleRecording}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition shrink-0 ${
              recording
                ? "border-pink-500/60 text-pink-400 bg-pink-500/10 animate-pulse"
                : "border-ink/10 text-ink/40 hover:text-violet-400 hover:border-violet-500/40"
            }`}
            title={recording ? "Stop recording" : "Voice input"}
          >
            <FontAwesomeIcon icon={recording ? faMicrophoneSlash : faMicrophone} />
          </button>
          <button
            onClick={send}
            disabled={loading || (!input.trim() && !attachedFile)}
            className="w-9 h-9 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-ink rounded-xl flex items-center justify-center transition shrink-0"
          >
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        </div>
       <p className="text-xs text-ink/20 text-center">
    Snap a photo or attach a PDF — AI will explain it all.
  </p>
      </div>
    </div>
  );
}

// ─── Summarize Tab ────────────────────────────────────────────────────────────
function SummarizeTab() {
  const [text, setText] = useState("");
  const [style, setStyle] = useState("Bullet points");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef(null);

  async function summarize() {
    if (!text.trim() && !attachedFile) return;
    setLoading(true);
    setError("");
    setSummary("");
    try {
      const finalText = text || `Summarize this ${attachedFile?.type === "application/pdf" ? "PDF" : "file"}.`;
      // Removed dead base64 code, using fetchAIWithFile directly
      const data = await fetchAIWithFile("summarize", { text: finalText, style }, attachedFile);
      setSummary(data.summary);
    } catch {
      setError("Failed to summarize. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
   <div className="space-y-4">
  {showCamera && (
    <CameraModal
      onCapture={(f) => { setAttachedFile(f); setShowCamera(false); }}
      onClose={() => setShowCamera(false)}
    />
  )}
  <div>
    <div className="flex items-center justify-between mb-2">
      <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase">
        Paste Your Notes
      </label>
      <GenerationHistory tool="summarize" onSelect={(gen) => setSummary(gen.result.summary)} />
    </div>
    <textarea
      rows={6}
      placeholder="Paste your notes or any text to summarize…"
      value={text}
      onChange={(e) => setText(e.target.value)}
      className="w-full bg-black/40 border border-ink/10 rounded-2xl px-4 py-3 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 resize-none transition"
    />
  </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowCamera(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-ink/10 text-ink/40 hover:text-violet-400 hover:border-violet-500/40 text-xs transition"
        >
          <FontAwesomeIcon icon={faCamera} />
          Snap
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-ink/10 text-ink/40 hover:text-violet-400 hover:border-violet-500/40 text-xs transition"
        >
          <FontAwesomeIcon icon={faPaperclip} />
          Attach
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => { if (e.target.files[0]) setAttachedFile(e.target.files[0]); e.target.value = ""; }}
        />
        {attachedFile && <FileChip file={attachedFile} onRemove={() => setAttachedFile(null)} />}
      </div>
      <div className="flex gap-2">
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className="flex-1 bg-black/40 border border-ink/10 rounded-2xl px-3 py-2.5 text-sm text-ink/70 outline-none focus:border-violet-500/60 transition"
        >
          <option>Bullet points</option>
          <option>Short paragraph</option>
          <option>Key terms only</option>
        </select>
        <button
          onClick={summarize}
          disabled={loading || (!text.trim() && !attachedFile)}
          className="px-5 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-ink rounded-2xl text-sm font-bold transition whitespace-nowrap"
        >
          Summarize
        </button>
      </div>
      {loading && <Spinner label="Summarizing…" />}
      {error && (
        <p className="text-pink-400 text-sm flex items-center gap-2">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          {error}
        </p>
      )}
      {summary && (
  <div className="rounded-2xl border border-violet-500/20 overflow-hidden">
    <div className="flex items-center justify-between px-4 py-2.5 bg-violet-500/10 border-b border-violet-500/20">
      <span className="text-xs font-semibold text-violet-400 tracking-widest uppercase">
        Summary
      </span>
      <button
        onClick={copy}
        className="text-xs text-violet-400 hover:text-violet-300 transition font-medium flex items-center gap-1.5"
      >
        <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
    <div className="p-4 text-sm leading-7 text-ink/80 bg-black/20 prose prose-invert prose-sm max-w-none">
     <ReactMarkdown
  remarkPlugins={[remarkGfm, remarkMath]}
  rehypePlugins={[[rehypeKatex, { strict: false }]]}
>
  {normalizeMathDelimiters(summary)}
</ReactMarkdown>
    </div>
  </div>
)}
    </div>
  );
}

function RevisionTab() {
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [revision, setRevision] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  useEffect(() => {
    if (mode !== "library" || materials.length > 0) return;
    let cancelled = false;
    (async () => {
      setMaterialsLoading(true);
      try {
        const data = await apiGet("/study-material");
        if (cancelled) return;
        setMaterials(data.filter((m) => m.fileType === "application/pdf" || m.fileType === "pdf"));
      } catch {
        if (!cancelled) setMaterials([]);
      } finally {
        if (!cancelled) setMaterialsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mode, materials.length]);

  async function generate() {
    if (mode === "library" && !selectedMaterial) { setError("Select a material first."); return; }
    if (mode === "text" && !text.trim() && !attachedFile) return;

    setLoading(true);
    setError("");
    setRevision("");
    try {
      let data;
      if (mode === "library") {
        data = await apiPost("/ai/revision", { materialId: selectedMaterial.id });
      } else {
        data = await fetchAIWithFile("revision", { text }, attachedFile);
      }
      setRevision(data.revision);
    } catch (err) {
      setError(err.message || "Failed to generate revision material. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(revision);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {showCamera && (
        <CameraModal onCapture={(f) => { setAttachedFile(f); setShowCamera(false); }} onClose={() => setShowCamera(false)} />
      )}

      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase">Source</label>
        <GenerationHistory tool="revision" onSelect={(gen) => setRevision(gen.result.revision)} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[{ id: "text", label: "Paste / Attach" }, { id: "library", label: "My Library" }].map((m) => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); if (m.id === "text") setSelectedMaterial(null); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
              mode === m.id ? "bg-violet-600 text-white border-violet-500" : "bg-white/5 text-ink/50 border-ink/10 hover:border-violet-500/40 hover:text-ink/80"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "text" && (
        <>
          <div>
            <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase mb-2">
              Paste Material to Condense
            </label>
            <textarea
              rows={6}
              placeholder="Paste notes, a chapter, or a topic to turn into a revision sheet…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-black/40 border border-ink/10 rounded-2xl px-4 py-3 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 resize-none transition"
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCamera(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-ink/10 text-ink/40 hover:text-violet-400 hover:border-violet-500/40 text-xs transition">
              <FontAwesomeIcon icon={faCamera} /> Snap
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-ink/10 text-ink/40 hover:text-violet-400 hover:border-violet-500/40 text-xs transition">
              <FontAwesomeIcon icon={faPaperclip} /> Attach
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
              onChange={(e) => { if (e.target.files[0]) setAttachedFile(e.target.files[0]); e.target.value = ""; }} />
            {attachedFile && <FileChip file={attachedFile} onRemove={() => setAttachedFile(null)} />}
          </div>
        </>
      )}

      {mode === "library" && (
        <div>
          <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase mb-2">Select a PDF</label>
          {materialsLoading ? (
            <Spinner label="Loading materials…" />
          ) : materials.length === 0 ? (
            <p className="text-sm text-ink/30">No PDF materials found in your library.</p>
          ) : (
            <select
              value={selectedMaterial?.id || ""}
              onChange={(e) => setSelectedMaterial(materials.find((m) => m.id === e.target.value) || null)}
              className="w-full bg-black/40 border border-ink/10 rounded-2xl px-3 py-2.5 text-sm text-ink/70 outline-none focus:border-violet-500/60 transition"
            >
              <option value="">Select a material…</option>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          )}
        </div>
      )}

      <button
        onClick={generate}
        disabled={loading || (mode === "text" ? (!text.trim() && !attachedFile) : !selectedMaterial)}
        className="w-full py-3 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-ink rounded-2xl text-sm font-bold transition"
      >
        {loading ? "Generating…" : "Generate Revision Sheet"}
      </button>

      {error && (
        <p className="text-pink-400 text-sm flex items-center gap-2">
          <FontAwesomeIcon icon={faTriangleExclamation} /> {error}
        </p>
      )}

      {revision && (
        <div className="rounded-2xl border border-violet-500/20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-violet-500/10 border-b border-violet-500/20">
            <span className="text-xs font-semibold text-violet-400 tracking-widest uppercase">Revision Sheet</span>
            <button onClick={copy} className="text-xs text-violet-400 hover:text-violet-300 transition font-medium flex items-center gap-1.5">
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} /> {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="p-4 text-sm leading-7 text-ink/80 bg-black/20 prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { strict: false }]]}>
              {normalizeMathDelimiters(revision)}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

function PracticeTab() {
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("");
  const [count, setCount] = useState("5");
  const [difficulty, setDifficulty] = useState("Medium");
  const [attachedFile, setAttachedFile] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [problems, setProblems] = useState([]);
  const [revealedIdx, setRevealedIdx] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  useEffect(() => {
    if (mode !== "library" || materials.length > 0) return;
    let cancelled = false;
    (async () => {
      setMaterialsLoading(true);
      try {
        const data = await apiGet("/study-material");
        if (cancelled) return;
        setMaterials(data.filter((m) => m.fileType === "application/pdf" || m.fileType === "pdf"));
      } catch {
        if (!cancelled) setMaterials([]);
      } finally {
        if (!cancelled) setMaterialsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mode, materials.length]);

  async function generate() {
    if (mode === "library" && !selectedMaterial) { setError("Select a material first."); return; }
    if (mode === "text" && !text.trim() && !attachedFile) return;

    setLoading(true);
    setError("");
    setProblems([]);
    setRevealedIdx({});
    try {
      let data;
      if (mode === "library") {
        data = await apiPost("/ai/practice", { materialId: selectedMaterial.id, count: Number(count), difficulty });
      } else {
        data = await fetchAIWithFile("practice", { text, count: Number(count), difficulty }, attachedFile);
      }
      setProblems(data.problems);
    } catch (err) {
      setError(err.message || "Failed to generate practice problems. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleReveal(i) {
    setRevealedIdx((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  return (
    <div className="space-y-4">
      {showCamera && (
        <CameraModal onCapture={(f) => { setAttachedFile(f); setShowCamera(false); }} onClose={() => setShowCamera(false)} />
      )}

      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase">Source</label>
        <GenerationHistory tool="practice" onSelect={(gen) => { setProblems(gen.result.problems); setRevealedIdx({}); }} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[{ id: "text", label: "Paste / Attach" }, { id: "library", label: "My Library" }].map((m) => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); if (m.id === "text") setSelectedMaterial(null); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
              mode === m.id ? "bg-violet-600 text-white border-violet-500" : "bg-white/5 text-ink/50 border-ink/10 hover:border-violet-500/40 hover:text-ink/80"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "text" && (
        <>
          <div>
            <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase mb-2">
              Paste Study Material
            </label>
            <textarea
              rows={5}
              placeholder="Paste the topic or material to generate practice problems from…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-black/40 border border-ink/10 rounded-2xl px-4 py-3 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 resize-none transition"
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCamera(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-ink/10 text-ink/40 hover:text-violet-400 hover:border-violet-500/40 text-xs transition">
              <FontAwesomeIcon icon={faCamera} /> Snap
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-ink/10 text-ink/40 hover:text-violet-400 hover:border-violet-500/40 text-xs transition">
              <FontAwesomeIcon icon={faPaperclip} /> Attach
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
              onChange={(e) => { if (e.target.files[0]) setAttachedFile(e.target.files[0]); e.target.value = ""; }} />
            {attachedFile && <FileChip file={attachedFile} onRemove={() => setAttachedFile(null)} />}
          </div>
        </>
      )}

      {mode === "library" && (
        <div>
          <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase mb-2">Select a PDF</label>
          {materialsLoading ? (
            <Spinner label="Loading materials…" />
          ) : materials.length === 0 ? (
            <p className="text-sm text-ink/30">No PDF materials found in your library.</p>
          ) : (
            <select
              value={selectedMaterial?.id || ""}
              onChange={(e) => setSelectedMaterial(materials.find((m) => m.id === e.target.value) || null)}
              className="w-full bg-black/40 border border-ink/10 rounded-2xl px-3 py-2.5 text-sm text-ink/70 outline-none focus:border-violet-500/60 transition"
            >
              <option value="">Select a material…</option>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <select value={count} onChange={(e) => setCount(e.target.value)} className="flex-1 bg-black/40 border border-ink/10 rounded-2xl px-3 py-2.5 text-sm text-ink/70 outline-none focus:border-violet-500/60 transition">
          <option value="3">3 problems</option>
          <option value="5">5 problems</option>
          <option value="10">10 problems</option>
        </select>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="flex-1 bg-black/40 border border-ink/10 rounded-2xl px-3 py-2.5 text-sm text-ink/70 outline-none focus:border-violet-500/60 transition">
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>
        <button
          onClick={generate}
          disabled={loading || (mode === "text" ? (!text.trim() && !attachedFile) : !selectedMaterial)}
          className="px-5 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-ink rounded-2xl text-sm font-bold transition whitespace-nowrap"
        >
          Generate
        </button>
      </div>

      {loading && <Spinner label="Generating practice problems…" />}
      {error && (
        <p className="text-pink-400 text-sm flex items-center gap-2">
          <FontAwesomeIcon icon={faTriangleExclamation} /> {error}
        </p>
      )}

      {problems.map((p, i) => (
        <div key={i} className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4">
          <p className="text-sm font-semibold text-ink mb-3">{i + 1}. {p.problem}</p>
          <button
            onClick={() => toggleReveal(i)}
            className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1.5 mb-2"
          >
            <FontAwesomeIcon icon={faChevronDown} className={`transition-transform ${revealedIdx[i] ? "rotate-180" : ""}`} />
            {revealedIdx[i] ? "Hide solution" : "Show solution"}
          </button>
          {revealedIdx[i] && (
            <div className="p-3 rounded-xl bg-black/20 text-sm leading-7 text-ink/80 prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { strict: false }]]}>
                {normalizeMathDelimiters(p.solution)}
              </ReactMarkdown>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ExplainTab() {
  const [mode, setMode] = useState("text"); // "text" | "library"
  const [text, setText] = useState("");
  const [level, setLevel] = useState("Detailed");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [continuing, setContinuing] = useState(false);

  // Library state
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  useEffect(() => {
    if (mode !== "library" || materials.length > 0) return;
    let cancelled = false;
    (async () => {
      setMaterialsLoading(true);
      try {
        const data = await apiGet("/study-material");
        if (cancelled) return;
        const pdfs = data.filter((m) => m.fileType === "application/pdf" || m.fileType === "pdf");
        setMaterials(pdfs);
      } catch {
        if (!cancelled) setMaterials([]);
      } finally {
        if (!cancelled) setMaterialsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mode, materials.length]);

  async function explain() {
    if (mode === "library" && !selectedMaterial) { setError("Select a material first."); return; }
    if (mode === "text" && !text.trim() && !attachedFile) return;

    setLoading(true);
    setError("");
    setExplanation("");
    setIsTruncated(false);
    try {
      let data;
      if (mode === "library") {
        data = await apiPost("/ai/explain/from-material", {
          materialId: selectedMaterial.id,
          level,
        });
      } else {
        const finalText = text || `Explain this ${attachedFile?.type === "application/pdf" ? "PDF" : "file"}.`;
        data = await fetchAIWithFile("explain", { text: finalText, level }, attachedFile);
      }
      setExplanation(data.explanation);
      setIsTruncated(!!data.truncated);
    } catch (err) {
      setError(err.message || "Failed to explain. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function continueExplaining() {
    setContinuing(true);
    try {
      const data = await fetchAIWithFile("explain", { text: "", level, continueFrom: explanation }, null);
      setExplanation((prev) => prev + "\n\n" + data.explanation);
      setIsTruncated(!!data.truncated);
    } catch (err) {
      setError(err.message || "Failed to continue. Please try again.");
    } finally {
      setContinuing(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {showCamera && (
        <CameraModal
          onCapture={(f) => { setAttachedFile(f); setShowCamera(false); }}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Source mode toggle */}
      <div>
  <div className="flex items-center justify-between mb-2">
    <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase">
      Source
    </label>
    <GenerationHistory
      tool="explain"
      onSelect={(gen) => { setExplanation(gen.result.explanation); setIsTruncated(!!gen.result.truncated); }}
    />
  </div>
  <div className="flex gap-2 flex-wrap">
          {[
            { id: "text", label: "Paste / Attach" },
            { id: "library", label: "My Library" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); if (m.id === "text") setSelectedMaterial(null); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                mode === m.id
                  ? "bg-violet-600 text-white border-violet-500"
                  : "bg-white/5 text-ink/50 border-ink/10 hover:border-violet-500/40 hover:text-ink/80"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "text" && (
        <>
          <div>
            <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase mb-2">
              Paste What You Want Explained
            </label>
            <textarea
              rows={6}
              placeholder="Paste a concept, passage, or question you want explained…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-black/40 border border-ink/10 rounded-2xl px-4 py-3 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 resize-none transition"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCamera(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-ink/10 text-ink/40 hover:text-violet-400 hover:border-violet-500/40 text-xs transition"
            >
              <FontAwesomeIcon icon={faCamera} />
              Snap
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-ink/10 text-ink/40 hover:text-violet-400 hover:border-violet-500/40 text-xs transition"
            >
              <FontAwesomeIcon icon={faPaperclip} />
              Attach
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => { if (e.target.files[0]) setAttachedFile(e.target.files[0]); e.target.value = ""; }}
            />
            {attachedFile && <FileChip file={attachedFile} onRemove={() => setAttachedFile(null)} />}
          </div>
        </>
      )}

      {mode === "library" && (
        <div>
          <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase mb-2">
            Select a PDF
          </label>
          {materialsLoading ? (
            <Spinner label="Loading materials…" />
          ) : materials.length === 0 ? (
            <p className="text-sm text-ink/30">No PDF materials found in your library.</p>
          ) : (
            <select
              value={selectedMaterial?.id || ""}
              onChange={(e) => setSelectedMaterial(materials.find((m) => m.id === e.target.value) || null)}
              className="w-full bg-black/40 border border-ink/10 rounded-2xl px-3 py-2.5 text-sm text-ink/70 outline-none focus:border-violet-500/60 transition"
            >
              <option value="">Select a material…</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="flex-1 bg-black/40 border border-ink/10 rounded-2xl px-3 py-2.5 text-sm text-ink/70 outline-none focus:border-violet-500/60 transition"
        >
          <option>Simple</option>
          <option>Detailed</option>
          <option>Like I'm 5</option>
        </select>
        <button
          onClick={explain}
          disabled={loading || (mode === "text" ? (!text.trim() && !attachedFile) : !selectedMaterial)}
          className="px-5 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-ink rounded-2xl text-sm font-bold transition whitespace-nowrap"
        >
          Explain
        </button>
      </div>

      {loading && <Spinner label="Explaining…" />}
      {error && (
        <p className="text-pink-400 text-sm flex items-center gap-2">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          {error}
        </p>
      )}
      {explanation && (
        <div className="rounded-2xl border border-violet-500/20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-violet-500/10 border-b border-violet-500/20">
            <span className="text-xs font-semibold text-violet-400 tracking-widest uppercase">
              Explanation
            </span>
            <button
              onClick={copy}
              className="text-xs text-violet-400 hover:text-violet-300 transition font-medium flex items-center gap-1.5"
            >
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="p-4 text-sm leading-7 text-ink/80 bg-black/20 prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[[rehypeKatex, { strict: false }]]}
            >
              {normalizeMathDelimiters(explanation)}
            </ReactMarkdown>
          </div>
        </div>
      )}
      {isTruncated && (
        <div className="px-4 pb-4 bg-black/20">
          <button
            onClick={continueExplaining}
            disabled={continuing}
            className="w-full py-2.5 rounded-xl border border-violet-500/30 text-violet-400 text-sm font-semibold hover:border-violet-500/50 hover:bg-violet-500/10 disabled:opacity-40 transition flex items-center justify-center gap-2"
          >
            {continuing ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                Continuing…
              </>
            ) : (
              "Continue explanation"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
// ------Study-Plan -----//

function StudyPlanTab() {
  const [subject, setSubject] = useState("");
  const [examDate, setExamDate] = useState("");
  const [daysAvailable, setDaysAvailable] = useState("7");
  const [hoursPerDay, setHoursPerDay] = useState("2");
  const [text, setText] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  async function generate() {
    if (!subject.trim()) { setError("Enter a subject or course first."); return; }
    setLoading(true);
    setError("");
    setPlan(null);
    try {
      const data = await fetchAIWithFile(
        "study-plan",
        { subject, examDate, daysAvailable, hoursPerDay, text },
        attachedFile
      );
      setPlan(data.plan);
    } catch (err) {
      setError(err.message || "Failed to generate study plan. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {showCamera && (
        <CameraModal
          onCapture={(f) => { setAttachedFile(f); setShowCamera(false); }}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div>
        <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase mb-2">
          Subject / Course
        </label>
        <input
          type="text"
          placeholder="e.g. CHE 205 Thermodynamics"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full bg-black/40 border border-ink/10 rounded-2xl px-4 py-2.5 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 transition"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase mb-2">
            Days
          </label>
          <input
            type="number"
            min="1"
            max="90"
            value={daysAvailable}
            onChange={(e) => setDaysAvailable(e.target.value)}
            className="w-full bg-black/40 border border-ink/10 rounded-2xl px-3 py-2.5 text-sm text-ink outline-none focus:border-violet-500/60 transition"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase mb-2">
            Hrs/day
          </label>
          <input
            type="number"
            min="1"
            max="12"
            value={hoursPerDay}
            onChange={(e) => setHoursPerDay(e.target.value)}
            className="w-full bg-black/40 border border-ink/10 rounded-2xl px-3 py-2.5 text-sm text-ink outline-none focus:border-violet-500/60 transition"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase mb-2">
            Exam date
          </label>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="w-full bg-black/40 border border-ink/10 rounded-2xl px-2 py-2.5 text-sm text-ink outline-none focus:border-violet-500/60 transition"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase mb-2">
          Notes or syllabus (optional)
        </label>
        <textarea
          rows={3}
          placeholder="Paste a syllabus, topic list, or notes to base the plan on…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-black/40 border border-ink/10 rounded-2xl px-4 py-3 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 resize-none transition"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowCamera(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-ink/10 text-ink/40 hover:text-violet-400 hover:border-violet-500/40 text-xs transition"
        >
          <FontAwesomeIcon icon={faCamera} />
          Snap
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-ink/10 text-ink/40 hover:text-violet-400 hover:border-violet-500/40 text-xs transition"
        >
          <FontAwesomeIcon icon={faPaperclip} />
          Attach syllabus
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => { if (e.target.files[0]) setAttachedFile(e.target.files[0]); e.target.value = ""; }}
        />
        {attachedFile && <FileChip file={attachedFile} onRemove={() => setAttachedFile(null)} />}
      </div>

      <button
        onClick={generate}
        disabled={loading || !subject.trim()}
        className="w-full py-3 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-ink rounded-2xl text-sm font-bold transition"
      >
        {loading ? "Generating…" : "Generate Study Plan"}
      </button>

      {error && (
        <p className="text-pink-400 text-sm flex items-center gap-2">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          {error}
        </p>
      )}

      {plan?.entries && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-violet-400 tracking-widest uppercase">
            Your {plan.daysAvailable}-Day Plan
          </p>
          {plan.entries.map((entry, i) => (
            <div key={i} className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4">
              <p className="text-xs text-violet-400 font-semibold mb-1">Day {entry.day}</p>
              <p className="text-sm font-bold text-ink mb-2">{entry.focus}</p>
              <ul className="space-y-1">
                {entry.tasks.map((t, ti) => (
                  <li key={ti} className="text-sm text-ink/60 flex items-start gap-2">
                    <span className="text-violet-400 mt-0.5">•</span>{t}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryPanel({ onClose, onSelectChat }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/ai/chat")
      .then((data) => setSessions(data))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  async function selectSession(session) {
    try {
      const fullSession = await apiGet(`/ai/chat/${session.id}`);
      onSelectChat(fullSession);
      onClose();
    } catch {
      // leave panel open on failure
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-bg-elevated border border-ink/10 rounded-3xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink/5 shrink-0">
          <div className="flex items-center gap-2 text-ink font-semibold text-sm">
            <FontAwesomeIcon icon={faClockRotateLeft} className="text-violet-400" />
            Previous Chats
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink transition">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-violet-400">
              <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
              Loading…
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-center text-ink/30 text-sm py-10">No previous AI chats found.</p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSession(s)}
                className="w-full text-left px-4 py-3 rounded-2xl bg-white/[0.03] border border-ink/5 hover:border-violet-500/30 hover:bg-violet-500/5 transition group"
              >
                <p className="text-sm text-ink/80 group-hover:text-ink transition truncate">
                  {s.title || "AI conversation"}
                </p>
                <p className="text-xs text-ink/30 mt-1">{timeAgo(s.updatedAt)}</p>
              </button>
            ))
          )}
        </div>
        <button
  onClick={() => { onSelectChat(null); onClose(); }}
  className="w-full text-left px-4 py-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/15 transition flex items-center gap-2 text-sm font-semibold text-violet-400"
>
  <FontAwesomeIcon icon={faComments} />
  Start New Chat
</button>
      </div>
    </div>
  );
}

function AI() {
  const location = useLocation();
  const [showHistory, setShowHistory] = useState(false);
  const [activeTool, setActiveTool] = useState(null); // null | "quiz" | "explain" | "revision" | "practice" | "summarize" | "plan"
  const preloadedFile = location.state?.preloadedFile || null;
  const [restoreChatItem, setRestoreChatItem] = useState(null);

  function handleSelectChat(item) {
    setRestoreChatItem(item === null ? { _new: true, _key: Date.now() } : { ...item, _key: Date.now() });
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      {showHistory && (
        <HistoryPanel onClose={() => setShowHistory(false)} onSelectChat={handleSelectChat} />
      )}
      {activeTool && (
        <ToolModal tool={activeTool} onClose={() => setActiveTool(null)} />
      )}

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
        <div className="absolute top-1/2 -right-20 w-72 h-72 bg-emerald-500 rounded-full opacity-8 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-pink-500 rounded-full opacity-8 blur-[100px]" />
      </div>

      <header className="fixed top-0 left-0 w-full z-40 bg-bg/80 backdrop-blur-md border-b border-ink/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-3">
  <Link to="/home" className="text-ink/40 hover:text-violet-400 transition">
    <FontAwesomeIcon icon={faChevronDown} className="rotate-90" />
  </Link>
  <h1 className="text-lg font-black tracking-tight">
    UNI<span className="text-violet-400">LIB</span>
    <span className="ml-1.5 text-xs font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full align-middle">
      AI
    </span>
  </h1>
  <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-violet-400/70 font-medium ml-1">
    <span className="w-1 h-1 bg-violet-400 rounded-full" />
    Powered by UNILIB AI
  </span>
</div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-1.5 text-xs text-ink/40 hover:text-violet-400 transition border border-ink/10 hover:border-violet-500/40 rounded-full px-3 py-1.5"
                title="Previous chats"
              >
                <FontAwesomeIcon icon={faClockRotateLeft} />
                <span className="hidden sm:inline">History</span>
              </button>
              <span className="flex items-center gap-1.5 text-xs text-violet-400 font-medium">
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
                Active
              </span>
            </div>
          </div>
          <div className="flex items-center justify-around border-t border-ink/5 px-2">
            {TAB_LINKS.map((tab) => {
              const isActive = location.pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  to={tab.href}
                  className={`flex flex-col items-center py-2 px-4 border-b-2 transition text-xs gap-0.5
                    ${isActive ? "border-violet-500 text-violet-400" : "border-transparent text-ink/30 hover:text-ink/60"}`}
                >
                  <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-24 px-4 pb-16 max-w-2xl mx-auto h-screen flex flex-col">
        <AskTab
          preloadedFile={preloadedFile}
          restoreChatItem={restoreChatItem}
          onOpenTool={setActiveTool}
        />
      </main>
    </div>
  );
}

export default AI;


