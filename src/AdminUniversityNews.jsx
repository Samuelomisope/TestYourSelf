import { useState, useEffect } from "react";
import { getUniversities, createUniversityNews } from "./api";
import { getAccessToken } from "./token";

/**
 * AdminUniversityNews
 *
 * Drop into Admin.jsx as a section/tab. Lets an admin pick a
 * university and post a news item — title, excerpt (list teaser),
 * full body, optional cover image, optional source link, and a
 * draft/published status so items can be prepped before going live.
 */
export default function AdminUniversityNews() {
  const [universities, setUniversities] = useState([]);
  const [universityId, setUniversityId] = useState("");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [status, setStatus] = useState("PUBLISHED");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState(null); // { type, message }

  useEffect(() => {
    getUniversities()
      .then((data) => {
        setUniversities(data);
        if (data.length > 0) setUniversityId(data[0].id);
      })
      .catch((err) => console.error(err));
  }, []);

  const resetForm = () => {
    setTitle("");
    setExcerpt("");
    setBody("");
    setSourceUrl("");
    setPublishedAt("");
    setStatus("PUBLISHED");
    setCoverImageUrl("");
  };

  // Reuses the same /upload/single endpoint pattern as profile photo
  // upload in Home.jsx, pointed at a "university-news" folder.
  const handleCoverImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const token = getAccessToken();
      const formData = new FormData();
      formData.append("file", file);
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const res = await fetch(`${apiUrl}/upload/single?folder=university-news`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      setCoverImageUrl(data.url);
    } catch (err) {
      console.error(err);
      setFormStatus({ type: "error", message: "Cover image upload failed." });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!universityId || !title.trim() || !excerpt.trim() || !body.trim()) {
      setFormStatus({ type: "error", message: "University, title, excerpt, and body are required." });
      return;
    }
    setSubmitting(true);
    setFormStatus(null);
    try {
      await createUniversityNews(universityId, {
        title: title.trim(),
        excerpt: excerpt.trim(),
        body: body.trim(),
        coverImageUrl: coverImageUrl || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        status,
        publishedAt: publishedAt || undefined,
      });
      setFormStatus({
        type: "success",
        message: status === "DRAFT" ? "Saved as draft." : "News item published.",
      });
      resetForm();
    } catch (err) {
      console.error(err);
      setFormStatus({ type: "error", message: "Failed to save. Check the console for details." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl rounded-2xl border border-ink/10 bg-bg-elevated p-6">
      <h2 className="mb-4 text-lg font-semibold text-ink">Post university news</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-ink/40">University</span>
          <select
            value={universityId}
            onChange={(e) => setUniversityId(e.target.value)}
            className="rounded-xl border border-ink/10 bg-bg px-3 py-2 text-sm text-ink"
          >
            {universities.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-ink/40">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Post-UTME screening now open"
            className="rounded-xl border border-ink/10 bg-bg px-3 py-2 text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-ink/40">
            Excerpt <span className="normal-case text-ink/25">— short teaser shown in the news list</span>
          </span>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            placeholder="One or two sentences summarizing the announcement"
            className="resize-none rounded-xl border border-ink/10 bg-bg px-3 py-2 text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-ink/40">Full body</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="Full announcement text"
            className="resize-none rounded-xl border border-ink/10 bg-bg px-3 py-2 text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-ink/40">Cover image (optional)</span>
          <input type="file" accept="image/*" onChange={handleCoverImageUpload} className="text-sm text-ink/60" />
          {uploadingImage && <span className="text-xs text-ink/30">Uploading…</span>}
          {coverImageUrl && (
            <img src={coverImageUrl} alt="Cover preview" className="mt-1 h-24 w-24 rounded-xl object-cover" />
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-ink/40">Source link (optional)</span>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://futa.edu.ng/..."
            className="rounded-xl border border-ink/10 bg-bg px-3 py-2 text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-ink/40">
            Publish date (optional — defaults to now)
          </span>
          <input
            type="date"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
            className="rounded-xl border border-ink/10 bg-bg px-3 py-2 text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-ink/40">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-ink/10 bg-bg px-3 py-2 text-sm text-ink"
          >
            <option value="PUBLISHED">Published — visible to students now</option>
            <option value="DRAFT">Draft — saved but not visible yet</option>
          </select>
        </label>

        {formStatus && (
          <p className={`text-sm ${formStatus.type === "error" ? "text-red-400" : "text-emerald-400"}`}>
            {formStatus.message}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || uploadingImage}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          {submitting ? "Saving…" : status === "DRAFT" ? "Save draft" : "Publish"}
        </button>
      </form>
    </div>
  );
}
