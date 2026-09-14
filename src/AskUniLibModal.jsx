import { useState, useRef } from "react";
import { getAccessToken } from "./token";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faCamera,
  faImage,
  faSpinner,
  faTriangleExclamation,
  faCopy,
  faCheck,
  faChevronDown,
  faRotateRight,
} from "@fortawesome/free-solid-svg-icons";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Friendly labels for the 7 content types the backend can detect, plus the
// UNKNOWN fallback. Keys must match AskUniLibContentType exactly.
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

async function askUniLib(image, question) {
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

export default function AskUniLibModal({ onClose }) {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  function handlePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError("");
    e.target.value = "";
  }

  function reset() {
    setImage(null);
    setPreviewUrl(null);
    setQuestion("");
    setResult(null);
    setError("");
    setShowExtractedText(false);
  }

  async function submit() {
    if (!image || loading) return;
    setLoading(true);
    setError("");
    try {
      const data = await askUniLib(image, question);
      setResult(data);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyAnswer() {
    if (!result?.answer) return;
    navigator.clipboard.writeText(result.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-bg-elevated border border-ink/10 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink/5 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-ink">
              Ask <span className="text-violet-400">UniLib</span>
            </h2>
            <span className="text-[10px] font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full">
              BETA
            </span>
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink transition">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Hidden inputs: gallery + camera-capture (mobile opens camera directly) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePick}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={handlePick}
          />

          {!previewUrl && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border border-dashed border-ink/15 text-ink/50 hover:border-violet-500/50 hover:text-violet-400 transition"
              >
                <FontAwesomeIcon icon={faCamera} className="text-xl" />
                <span className="text-xs font-medium">Take a Photo</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border border-dashed border-ink/15 text-ink/50 hover:border-violet-500/50 hover:text-violet-400 transition"
              >
                <FontAwesomeIcon icon={faImage} className="text-xl" />
                <span className="text-xs font-medium">Choose Image</span>
              </button>
            </div>
          )}

          {previewUrl && !result && (
            <div className="relative rounded-2xl overflow-hidden border border-ink/10">
              <img src={previewUrl} alt="Selected" className="w-full max-h-64 object-contain bg-black/40" />
              <button
                onClick={reset}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-ink/70 hover:text-ink flex items-center justify-center transition"
                title="Remove"
              >
                <FontAwesomeIcon icon={faXmark} className="text-xs" />
              </button>
            </div>
          )}

          {previewUrl && !result && (
            <div>
              <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase mb-2">
                What do you want to know? (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Can you explain question 2?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                disabled={loading}
                className="w-full bg-black/40 border border-ink/10 rounded-2xl px-4 py-2.5 text-sm text-ink placeholder-white/20 outline-none focus:border-violet-500/60 transition"
              />
            </div>
          )}

          {previewUrl && !result && (
            <button
              onClick={submit}
              disabled={loading}
              className="w-full py-3 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-ink rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  Reading your image…
                </>
              ) : (
                "Ask UniLib"
              )}
            </button>
          )}

          {error && (
            <p className="text-pink-400 text-sm flex items-center gap-2">
              <FontAwesomeIcon icon={faTriangleExclamation} />
              {error}
            </p>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              {previewUrl && (
                <img src={previewUrl} alt="Analyzed" className="w-full max-h-48 object-contain bg-black/40 rounded-2xl border border-ink/10" />
              )}

              <div className="flex items-center justify-between">
                <ConfidenceBadge contentType={result.contentType} confidence={result.contentTypeConfidence} />
                {result.isUncertain && (
                  <span className="text-[11px] text-amber-400 flex items-center gap-1">
                    <FontAwesomeIcon icon={faTriangleExclamation} />
                    Low confidence
                  </span>
                )}
              </div>

              <div className="rounded-2xl border border-violet-500/20 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-violet-500/10 border-b border-violet-500/20">
                  <span className="text-xs font-semibold text-violet-400 tracking-widest uppercase">Answer</span>
                  <button
                    onClick={copyAnswer}
                    className="text-xs text-violet-400 hover:text-violet-300 transition font-medium flex items-center gap-1.5"
                  >
                    <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="p-4 text-sm leading-7 text-ink/85 whitespace-pre-line bg-black/20">
                  {result.answer}
                </div>
              </div>

              {result.extractedText?.trim() && (
                <div className="rounded-2xl border border-ink/10 overflow-hidden">
                  <button
                    onClick={() => setShowExtractedText((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-white/[0.03] text-xs font-semibold text-ink/40 tracking-widest uppercase"
                  >
                    Raw Extracted Text
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className={`transition-transform ${showExtractedText ? "rotate-180" : ""}`}
                    />
                  </button>
                  {showExtractedText && (
                    <div className="p-4 text-xs leading-6 text-ink/40 whitespace-pre-line bg-black/20 max-h-40 overflow-y-auto">
                      {result.extractedText}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={reset}
                className="w-full py-2.5 rounded-2xl border border-ink/10 text-ink/50 text-sm font-medium hover:border-violet-500/40 hover:text-violet-400 transition flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faRotateRight} />
                Ask Another
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
