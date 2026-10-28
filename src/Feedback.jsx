import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getAccessToken } from "./token";
import { API } from "./config";

const CATEGORIES = ["Bug", "Suggestion", "General"];

function Feedback() {
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState("General");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!rating) return setError("Please select a rating.");
    if (!message.trim()) return setError("Please enter a message.");

    setSubmitting(true);
    setError("");
    try {
      const token = getAccessToken();
      const res = await fetch(`${API}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating,
          category,
          message: message.trim(),
          page: location.state?.from || location.pathname,
        }),
      });
      if (!res.ok) throw new Error("Feedback submission failed");
      setDone(true);
    } catch {
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setRating(0);
    setCategory("General");
    setMessage("");
    setDone(false);
    setError("");
  };

  return (
    <main className="min-h-screen bg-bg text-ink px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <Link to="/home" className="inline-flex items-center gap-2 text-sm text-ink/50 hover:text-violet-400 transition">
          <span aria-hidden="true">←</span> Back to UniLib
        </Link>

        <section className="mt-8 rounded-3xl border border-ink/10 bg-bg-elevated p-6 shadow-xl sm:p-9">
          {done ? (
            <div className="py-8 text-center">
              <span className="text-5xl" role="img" aria-label="Celebration">🎉</span>
              <h1 className="mt-4 text-2xl font-bold">Thanks for your feedback!</h1>
              <p className="mt-2 text-sm text-ink/50">Your response has been recorded.</p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <button onClick={resetForm} className="rounded-full border border-ink/10 px-5 py-3 text-sm font-medium text-ink/70 hover:bg-white/5 transition">
                  Send more feedback
                </button>
                <Link to="/home" className="rounded-full bg-violet-500 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-violet-400 transition">
                  Back to UniLib
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Help us improve</p>
                <h1 className="mt-2 text-3xl font-black">Share feedback</h1>
                <p className="mt-2 text-sm leading-relaxed text-ink/50">Tell us what is working well or what we can make better.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-7">
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-ink/70">How would you rate your experience?</legend>
                  <div className="flex gap-2" role="group" aria-label="Experience rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
                        aria-pressed={rating === star}
                        className={`text-3xl transition ${star <= rating ? "text-yellow-400" : "text-ink/20 hover:text-yellow-300"}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-ink/70">Category</legend>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCategory(item)}
                        aria-pressed={category === item}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${category === item ? "border-violet-500 bg-violet-500/15 text-violet-300" : "border-ink/10 text-ink/50 hover:border-violet-500/40"}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <label htmlFor="feedback-message" className="mb-2 block text-sm font-medium text-ink/70">Message</label>
                  <textarea
                    id="feedback-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Tell us what you think..."
                    rows={6}
                    maxLength={5000}
                    required
                    className="w-full resize-y rounded-2xl border border-ink/10 bg-bg px-4 py-3 text-sm text-ink placeholder:text-ink/30 outline-none transition focus:border-violet-400"
                  />
                  <p className="mt-1 text-right text-xs text-ink/30">{message.length}/5000</p>
                </div>

                {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit feedback"}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default Feedback;
