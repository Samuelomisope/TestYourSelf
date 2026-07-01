import React, { useState, useRef } from "react";

/**
 * QuizSourcePicker
 * Lets a user generate a quiz from:
 *  1) An existing material in their library (pass materialId straight through)
 *  2) A fresh PDF upload from their device
 *  3) A camera scan of physical notes (routed to Groq image pipeline)
 *
 * Wire `onGenerate` to your existing quiz generation call. It receives
 * a normalized payload so your downstream logic doesn't need to know
 * which source was used.
 */

const ACCEPTED_PDF = ".pdf,application/pdf";
const ACCEPTED_IMAGE = "image/*";

export default function QuizSourcePicker({ libraryMaterials = [], onGenerate }) {
  const [mode, setMode] = useState("library"); // "library" | "upload" | "scan"
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  function handleFileChange(e, source) {
    const picked = e.target.files?.[0];
    if (!picked) return;

    if (source === "upload" && picked.type !== "application/pdf") {
      setError("Please select a PDF file.");
      return;
    }
    if (source === "scan" && !picked.type.startsWith("image/")) {
      setError("Please capture a photo.");
      return;
    }

    setError("");
    setFile(picked);
    setMode(source);
  }

  async function handleSubmit() {
    setError("");

    if (mode === "library" && !selectedMaterialId) {
      setError("Pick a material from the library first.");
      return;
    }
    if ((mode === "upload" || mode === "scan") && !file) {
      setError("Add a file first.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "library") {
        await onGenerate({ source: "library", materialId: selectedMaterialId });
      } else {
        // upload / scan both send raw file data; backend decides
        // PDF -> Claude pipeline, image -> Groq pipeline
        const formData = new FormData();
        formData.append("file", file);
        formData.append("source", mode); // "upload" | "scan"
        await onGenerate({ source: mode, formData });
      }
    } catch (err) {
      setError(err?.message || "Something went wrong generating the quiz.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-5">
      <h2 className="text-lg font-semibold text-white">Generate a quiz</h2>

      {/* Source toggle */}
      <div className="flex gap-2 flex-wrap">
        <SourceTab label="From Library" active={mode === "library"} onClick={() => setMode("library")} />
        <SourceTab label="Upload PDF" active={mode === "upload"} onClick={() => fileInputRef.current?.click()} />
        <SourceTab label="Scan with Camera" active={mode === "scan"} onClick={() => cameraInputRef.current?.click()} />
      </div>

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_PDF}
        className="hidden"
        onChange={(e) => handleFileChange(e, "upload")}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={ACCEPTED_IMAGE}
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileChange(e, "scan")}
      />

      {/* Mode-specific UI */}
      {mode === "library" && (
        <select
          value={selectedMaterialId}
          onChange={(e) => setSelectedMaterialId(e.target.value)}
          className="w-full rounded-lg bg-black/40 border border-white/10 text-white px-3 py-2 outline-none focus:border-violet-500"
        >
          <option value="">Select a material…</option>
          {libraryMaterials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      )}

      {(mode === "upload" || mode === "scan") && file && (
        <div className="text-sm text-white/70 truncate">
          Selected: <span className="text-violet-300">{file.name}</span>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-2.5 transition-colors"
      >
        {isSubmitting ? "Generating…" : "Generate Quiz"}
      </button>
    </div>
  );
}

function SourceTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
        active
          ? "bg-violet-600 text-white"
          : "bg-white/5 text-white/60 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}
