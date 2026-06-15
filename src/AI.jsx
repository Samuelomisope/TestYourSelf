import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { auth } from "./firebase";
import { getIdToken } from "firebase/auth";
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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function fetchAI(endpoint, body) {
  const token = await getIdToken(auth.currentUser, true);
  const res = await fetch(`${API_URL}/ai/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

async function apiGet(path) {
  const token = await getIdToken(auth.currentUser, true);
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

function fileIcon(type) {
  if (!type) return faFile;
  if (type.startsWith("image/")) return faImage;
  if (type === "application/pdf") return faFilePdf;
  if (type.includes("word")) return faFileWord;
  if (type.includes("presentation") || type.includes("powerpoint")) return faFilePowerpoint;
  return faFile;
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("Read failed"));
    r.readAsDataURL(file);
  });
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
      <div className="bg-[#0d0d14] border border-white/10 rounded-3xl overflow-hidden w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <span className="text-sm font-semibold text-white">Take a Snap</span>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">
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
            className="flex-1 py-2.5 rounded-2xl border border-white/10 text-white/50 text-sm hover:border-white/20 transition"
          >
            Cancel
          </button>
          <button
            onClick={capture}
            disabled={!streaming}
            className="flex-1 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2"
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
  const [text, setText] = useState("");
  const [count, setCount] = useState("5");
  const [difficulty, setDifficulty] = useState("Medium");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setQuestions([]);
    setAnswers({});
    try {
      const data = await fetchAI("quiz", { text, count: Number(count), difficulty });
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
      <div>
        <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase mb-2">
          Paste Your Study Material
        </label>
        <textarea
          rows={5}
          placeholder="e.g. The mitochondria is the powerhouse of the cell…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 resize-none transition"
        />
      </div>
      <div className="flex gap-2">
        <select
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-3 py-2.5 text-sm text-white/70 outline-none focus:border-violet-500/60 transition"
        >
          <option value="3">3 questions</option>
          <option value="5">5 questions</option>
          <option value="10">10 questions</option>
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-3 py-2.5 text-sm text-white/70 outline-none focus:border-violet-500/60 transition"
        >
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>
        <button
          onClick={generate}
          disabled={loading || !text.trim()}
          className="px-5 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white rounded-2xl text-sm font-bold transition whitespace-nowrap"
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
      {questions.map((q, qi) => (
        <div key={qi} className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4">
          <p className="text-sm font-semibold text-white mb-3">
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
                      : "border-white/10 text-white/60 hover:border-violet-400/50 hover:text-violet-300 bg-black/20"
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
        <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-center py-5 font-bold text-lg shadow-lg shadow-violet-500/20">
          Score: {score} / {questions.length}
          <p className="text-sm font-normal mt-1 text-white/80">
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

// ─── Ask AI Tab ───────────────────────────────────────────────────────────────
function AskTab() {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hi! I'm TESTYOURSELF AI. Ask me anything — type, speak, snap a photo, or upload a file!",
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
  const audioChunksRef = useRef([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Voice recording
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
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        // Use Web Speech API for transcription (browser-native, free)
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = "en-US";
        recognition.onresult = (e) => {
          const transcript = e.results[0][0].transcript;
          setInput(transcript);
        };
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

  // File attach
  function handleFileAttach(e) {
    const file = e.target.files[0];
    if (file) setAttachedFile(file);
    e.target.value = "";
  }

  // Camera capture
  function handleCapture(file) {
    setAttachedFile(file);
    setShowCamera(false);
  }

  // Send message
  async function send() {
    const msg = input.trim();
    if ((!msg && !attachedFile) || loading) return;
    setInput("");

    const userMsg = { role: "user", text: msg, file: attachedFile };
    setMessages((prev) => [...prev, userMsg]);
    setAttachedFile(null);
    setLoading(true);

    try {
      let question = msg;
      // NEW
let fileData = null;
let fileMimeType = null;

if (attachedFile) {
  fileData = await fileToBase64(attachedFile);
  fileMimeType = attachedFile.type;
  question = msg || (
    attachedFile.type.startsWith("image/") ? "Please explain what you see in this image." :
    attachedFile.type === "application/pdf" ? "Please summarize and explain this PDF." :
    attachedFile.type.startsWith("video/") ? "Please explain what is in this video." :
    `Please analyze this file: ${attachedFile.name}`
  );
}

const payload = { question };
if (fileData) {
  payload.fileData = fileData;
  payload.fileMimeType = fileMimeType;
}

      const data = await fetchAI("ask", payload);
      const aiText = data.answer;

      setMessages((prev) => [...prev, { role: "ai", text: aiText }]);

      if (ttsEnabled) {
        const idx = messages.length + 1;
        setSpeakingIndex(idx);
        speak(aiText);
        const utt = window.speechSynthesis.speaking;
        const check = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            setSpeakingIndex(null);
            clearInterval(check);
          }
        }, 500);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Something went wrong. Please try again." },
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
    <div className="flex flex-col gap-3">
      {showCamera && <CameraModal onCapture={handleCapture} onClose={() => setShowCamera(false)} />}

      {/* TTS toggle */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-white/30">Voice replies</span>
        <button
          onClick={() => {
            setTtsEnabled((v) => !v);
            if (ttsEnabled) stopSpeaking();
          }}
          className={`text-xs px-3 py-1 rounded-full border transition font-medium ${
            ttsEnabled
              ? "border-violet-500/50 text-violet-400 bg-violet-500/10"
              : "border-white/10 text-white/30"
          }`}
        >
          <FontAwesomeIcon icon={ttsEnabled ? faVolumeHigh : faVolumeMute} className="mr-1.5" />
          {ttsEnabled ? "On" : "Off"}
        </button>
      </div>

      {/* Messages */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "ai" && (
              <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center text-xs font-bold text-white mr-2 mt-1 shrink-0">
                <FontAwesomeIcon icon={faRobot} className="text-[10px]" />
              </div>
            )}
            <div className="max-w-[80%] flex flex-col gap-1">
              {m.file && (
                <FileChip file={m.file} />
              )}
              {m.text && (
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    m.role === "ai"
                      ? "bg-white/5 border border-white/10 text-white/85 rounded-tl-sm"
                      : "bg-violet-500 text-white rounded-tr-sm"
                  }`}
                >
                  {m.text}
                </div>
              )}
              {m.role === "ai" && m.text && (
                <div className="flex items-center gap-2 px-1">
                  <button
                    onClick={() => copyMessage(m.text, i)}
                    className="text-white/20 hover:text-violet-400 transition text-xs"
                    title="Copy"
                  >
                    <FontAwesomeIcon icon={copiedIndex === i ? faCheck : faCopy} />
                  </button>
                  <button
                    onClick={() => toggleSpeak(m.text, i)}
                    className={`transition text-xs ${
                      speakingIndex === i ? "text-violet-400" : "text-white/20 hover:text-violet-400"
                    }`}
                    title={speakingIndex === i ? "Stop" : "Read aloud"}
                  >
                    <FontAwesomeIcon icon={speakingIndex === i ? faStop : faVolumeHigh} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
              <FontAwesomeIcon icon={faRobot} className="text-[10px]" />
            </div>
            <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1">
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
      <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
        <div className="flex items-center gap-2">
          {/* Camera */}
          <button
            onClick={() => setShowCamera(true)}
            className="w-9 h-9 rounded-xl border border-white/10 text-white/40 hover:text-violet-400 hover:border-violet-500/40 flex items-center justify-center transition shrink-0"
            title="Take a snap"
          >
            <FontAwesomeIcon icon={faCamera} />
          </button>

          {/* File upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 rounded-xl border border-white/10 text-white/40 hover:text-violet-400 hover:border-violet-500/40 flex items-center justify-center transition shrink-0"
            title="Attach file"
          >
            <FontAwesomeIcon icon={faPaperclip} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"
            className="hidden"
            onChange={handleFileAttach}
          />

          {/* Text input */}
          <input
            type="text"
            placeholder={recording ? "Listening…" : "Ask a question…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            disabled={loading}
            className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 transition"
          />

          {/* Voice */}
          <button
            onClick={toggleRecording}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition shrink-0 ${
              recording
                ? "border-pink-500/60 text-pink-400 bg-pink-500/10 animate-pulse"
                : "border-white/10 text-white/40 hover:text-violet-400 hover:border-violet-500/40"
            }`}
            title={recording ? "Stop recording" : "Voice input"}
          >
            <FontAwesomeIcon icon={recording ? faMicrophoneSlash : faMicrophone} />
          </button>

          {/* Send */}
          <button
            onClick={send}
            disabled={loading || (!input.trim() && !attachedFile)}
            className="w-9 h-9 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition shrink-0"
          >
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        </div>
        <p className="text-xs text-white/20 text-center">
          Snap a photo, attach a PDF/Word/PPT, or use voice — AI will explain it all.
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
      let finalText = text;
      let imageData = null;
      let imageMediaType = null;

let fileData = null;
let fileMimeType = null;

if (attachedFile) {
  fileData = await fileToBase64(attachedFile);
  fileMimeType = attachedFile.type;
  finalText = text || `Summarize this ${attachedFile.type === 'application/pdf' ? 'PDF' : 'file'}.`;
}

const payload = { text: finalText, style };
if (fileData) {
  payload.fileData = fileData;
  payload.fileMimeType = fileMimeType;
}

      const data = await fetchAI("summarize", payload);
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
        <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase mb-2">
          Paste Your Notes
        </label>
        <textarea
          rows={6}
          placeholder="Paste your notes or any text to summarize…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 resize-none transition"
        />
      </div>

      {/* File attach row */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowCamera(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-white/40 hover:text-violet-400 hover:border-violet-500/40 text-xs transition"
        >
          <FontAwesomeIcon icon={faCamera} />
          Snap
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-white/40 hover:text-violet-400 hover:border-violet-500/40 text-xs transition"
        >
          <FontAwesomeIcon icon={faPaperclip} />
          Attach
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"
          className="hidden"
          onChange={(e) => { if (e.target.files[0]) setAttachedFile(e.target.files[0]); e.target.value = ""; }}
        />
        {attachedFile && <FileChip file={attachedFile} onRemove={() => setAttachedFile(null)} />}
      </div>

      <div className="flex gap-2">
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-3 py-2.5 text-sm text-white/70 outline-none focus:border-violet-500/60 transition"
        >
          <option>Bullet points</option>
          <option>Short paragraph</option>
          <option>Key terms only</option>
        </select>
        <button
          onClick={summarize}
          disabled={loading || (!text.trim() && !attachedFile)}
          className="px-5 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white rounded-2xl text-sm font-bold transition whitespace-nowrap"
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
          <div className="p-4 text-sm leading-7 text-white/80 whitespace-pre-line bg-black/20">
            {summary}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History Panel ─────────────────────────────────────────────────────────────
function HistoryPanel({ onClose, onSelectChat }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/users/me/activity")
      .then((data) => {
        const aiChats = data.filter((item) => item.type === "ai");
        setHistory(aiChats);
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d0d14] border border-white/10 rounded-3xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <FontAwesomeIcon icon={faClockRotateLeft} className="text-violet-400" />
            Previous Chats
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-violet-400">
              <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
              Loading…
            </div>
          ) : history.length === 0 ? (
            <p className="text-center text-white/30 text-sm py-10">No previous AI chats found.</p>
          ) : (
            history.map((item) => (
              <button
                key={item.id}
                onClick={() => { onSelectChat(item); onClose(); }}
                className="w-full text-left px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5 transition group"
              >
                <p className="text-sm text-white/80 group-hover:text-white transition truncate">
                  {item.description || "AI conversation"}
                </p>
                <p className="text-xs text-white/30 mt-1">{timeAgo(item.createdAt)}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main AI Page ─────────────────────────────────────────────────────────────
function AI() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("quiz");
  const [showHistory, setShowHistory] = useState(false);

  const TABS = [
    { id: "quiz", label: "Quiz" },
    { id: "ask", label: "Ask AI" },
    { id: "summarize", label: "Summarize" },
  ];

  function handleSelectChat(item) {
    setActiveTab("ask");
    // The AskTab is stateful — we trigger a custom event to pre-fill it
    window.dispatchEvent(new CustomEvent("ai:load-chat", { detail: item }));
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {showHistory && (
        <HistoryPanel
          onClose={() => setShowHistory(false)}
          onSelectChat={handleSelectChat}
        />
      )}

      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
        <div className="absolute top-1/2 -right-20 w-72 h-72 bg-emerald-500 rounded-full opacity-8 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-pink-500 rounded-full opacity-8 blur-[100px]" />
      </div>

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
                <span className="ml-1.5 text-xs font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full align-middle">
                  AI
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {/* History button */}
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-violet-400 transition border border-white/10 hover:border-violet-500/40 rounded-full px-3 py-1.5"
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

          {/* Nav tabs */}
          <div className="flex items-center justify-around border-t border-white/5 px-2">
            {TAB_LINKS.map((tab) => {
              const isActive = location.pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  to={tab.href}
                  className={`flex flex-col items-center py-2 px-4 border-b-2 transition text-xs gap-0.5
                    ${isActive
                      ? "border-violet-500 text-violet-400"
                      : "border-transparent text-white/30 hover:text-white/60"
                    }`}
                >
                  <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="relative z-10 pt-28 px-4 pb-16 max-w-2xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-8 mt-2">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/25 rounded-full px-4 py-1.5 text-xs text-violet-400 font-medium mb-4">
            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
            Powered by TESTYOURSELF AI
          </div>
          <h2 className="text-3xl font-black tracking-tight mb-2">
            Your <span className="text-violet-400">AI Study</span> Companion
          </h2>
          <p className="text-white/40 text-sm">
            Generate quizzes, get instant answers, and summarize any material in seconds.
          </p>
        </div>

        {/* Feature tabs */}
        <div className="flex gap-1.5 bg-white/5 border border-white/10 rounded-2xl p-1.5 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition
                ${activeTab === tab.id
                  ? "bg-violet-500 text-white shadow-lg shadow-violet-500/25"
                  : "text-white/40 hover:text-white/70"
                }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
          {activeTab === "quiz" && <QuizTab />}
          {activeTab === "ask" && <AskTab />}
          {activeTab === "summarize" && <SummarizeTab />}
        </div>
      </main>
    </div>
  );
}

export default AI;
