import { useState } from "react";
import { auth } from "./firebase";
import { getIdToken } from "firebase/auth";
import { API } from "./config";
import { useLocation } from "react-router-dom";

const CATEGORIES = ["Bug", "Suggestion", "General"];

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-2xl transition ${star <= value ? "text-yellow-400" : "text-gray-300"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState("General");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();

  const reset = () => {
    setRating(0);
    setCategory("General");
    setMessage("");
    setDone(false);
    setError("");
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(reset, 300);
  };

  const handleSubmit = async () => {
    if (!rating) return setError("Please select a rating.");
    if (!message.trim()) return setError("Please enter a message.");
    setSubmitting(true);
    setError("");
    try {
      const token = await getIdToken(auth.currentUser, true);
      const res = await fetch(`${API}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating,
          category,
          message,
          page: location.pathname,
        }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      setTimeout(handleClose, 2000);
    } catch {
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full shadow-lg px-4 py-2.5 text-sm font-medium transition flex items-center gap-2"
      >
        <span className="text-base">💬</span> Feedback
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
          onClick={handleClose}
        >
          {/* Modal */}
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <span className="text-5xl">🎉</span>
                <p className="text-indigo-500 font-bold text-lg">Thanks for your feedback!</p>
                <p className="text-gray-400 text-sm text-center">Your response has been recorded.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-800">Share Feedback</h3>
                  <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                {/* Rating */}
                <div>
                  <p className="text-sm text-gray-500 mb-1">How would you rate your experience?</p>
                  <StarRating value={rating} onChange={setRating} />
                </div>

                {/* Category */}
                <div>
                  <p className="text-sm text-gray-500 mb-1">Category</p>
                  <div className="flex gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                          category === cat
                            ? "bg-indigo-500 text-white border-indigo-500"
                            : "border-gray-200 text-gray-500 hover:border-indigo-300"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <p className="text-sm text-gray-500 mb-1">Message</p>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what you think..."
                    rows={4}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-indigo-400 transition resize-none"
                  />
                </div>

                {error && <p className="text-red-500 text-xs">{error}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full h-12 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-sm transition disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default FeedbackWidget;