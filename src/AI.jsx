import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { auth } from "./firebase";
import { getIdToken } from "firebase/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const TAB_LINKS = [
  {
    href: "/home", label: "Home",
    icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
  },
  {
    href: "/study-material", label: "Study",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
  },
  {
    href: "/ai", label: "AI",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
  },
  {
    href: "/chat", label: "Chat",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
  },
  {
    href: "/marketplace", label: "Market",
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
  },
];

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

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center gap-2 text-violet-400 text-sm">
      <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
      TESTYOURSELF AI is thinking…
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
    setAnswers(prev => ({ ...prev, [qi]: opt }));
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
          onChange={e => setText(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 resize-none transition"
        />
      </div>

      <div className="flex gap-2">
        <select
          value={count}
          onChange={e => setCount(e.target.value)}
          className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-3 py-2.5 text-sm text-white/70 outline-none focus:border-violet-500/60 transition"
        >
          <option value="3">3 questions</option>
          <option value="5">5 questions</option>
          <option value="10">10 questions</option>
        </select>
        <select
          value={difficulty}
          onChange={e => setDifficulty(e.target.value)}
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
          ✦ Generate
        </button>
      </div>

      {loading && <Spinner />}
      {error && <p className="text-pink-400 text-sm">{error}</p>}

      {questions.map((q, qi) => (
        <div key={qi} className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4">
          <p className="text-sm font-semibold text-white mb-3">{qi + 1}. {q.question}</p>
          <div className="space-y-2">
            {q.options.map(opt => {
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
            <p className="text-xs text-emerald-400 mt-2">✓ Correct answer: {q.answer}</p>
          )}
        </div>
      ))}

      {allDone && (
        <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-center py-5 font-bold text-lg shadow-lg shadow-violet-500/20">
          🎯 Score: {score} / {questions.length}
          <p className="text-sm font-normal mt-1 text-white/80">
            {score === questions.length ? "Perfect! You nailed it!" : score >= questions.length / 2 ? "Good job! Keep it up!" : "Keep studying, you've got this! 📚"}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Ask AI Tab ───────────────────────────────────────────────────────────────
function AskTab() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hi! I'm TESTYOURSELF AI. Ask me anything about your study material or any topic you're learning!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const data = await fetchAI("ask", { question: msg });
      setMessages(prev => [...prev, { role: "ai", text: data.answer }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "ai" && (
              <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center text-xs font-bold text-white mr-2 mt-1 shrink-0">
                AI
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed
              ${m.role === "ai"
                ? "bg-white/5 border border-white/10 text-white/85 rounded-tl-sm"
                : "bg-violet-500 text-white rounded-tr-sm"
              }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
              AI
            </div>
            <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-2 border-t border-white/5">
        <input
          type="text"
          placeholder="Ask a question…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          disabled={loading}
          className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 transition"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-5 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white rounded-2xl text-sm font-bold transition"
        >
          Send ↗
        </button>
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

  async function summarize() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setSummary("");
    try {
      const data = await fetchAI("summarize", { text, style });
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
      <div>
        <label className="block text-xs font-semibold text-violet-400 tracking-widest uppercase mb-2">
          Paste Your Notes
        </label>
        <textarea
          rows={6}
          placeholder="Paste your notes or any text to summarize…"
          value={text}
          onChange={e => setText(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 resize-none transition"
        />
      </div>

      <div className="flex gap-2">
        <select
          value={style}
          onChange={e => setStyle(e.target.value)}
          className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-3 py-2.5 text-sm text-white/70 outline-none focus:border-violet-500/60 transition"
        >
          <option>Bullet points</option>
          <option>Short paragraph</option>
          <option>Key terms only</option>
        </select>
        <button
          onClick={summarize}
          disabled={loading || !text.trim()}
          className="px-5 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white rounded-2xl text-sm font-bold transition whitespace-nowrap"
        >
          ✦ Summarize
        </button>
      </div>

      {loading && <Spinner />}
      {error && <p className="text-pink-400 text-sm">{error}</p>}

      {summary && (
        <div className="rounded-2xl border border-violet-500/20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-violet-500/10 border-b border-violet-500/20">
            <span className="text-xs font-semibold text-violet-400 tracking-widest uppercase">Summary</span>
            <button
              onClick={copy}
              className="text-xs text-violet-400 hover:text-violet-300 transition font-medium"
            >
              {copied ? "Copied! ✓" : "Copy ↗"}
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

// ─── Main AI Page ─────────────────────────────────────────────────────────────
function AI() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("quiz");

  const TABS = [
    { id: "quiz",      label: "Quiz",      emoji: "📋" },
    { id: "ask",       label: "Ask AI",    emoji: "💬" },
    { id: "summarize", label: "Summarize", emoji: "📄" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* Ambient background orbs */}
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </Link>
              <h1 className="text-lg font-black tracking-tight">
                TEST<span className="text-violet-400">YOURSELF</span>
                <span className="ml-1.5 text-xs font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full align-middle">
                  AI
                </span>
              </h1>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-violet-400 font-medium">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
              Active
            </span>
          </div>

          {/* Nav */}
          <div className="flex items-center justify-around border-t border-white/5 px-2">
            {TAB_LINKS.map(tab => {
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
                  {tab.icon}
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
            Powered by Claude AI
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
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition
                ${activeTab === tab.id
                  ? "bg-violet-500 text-white shadow-lg shadow-violet-500/25"
                  : "text-white/40 hover:text-white/70"
                }`}
            >
              <span>{tab.emoji}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
          {activeTab === "quiz"      && <QuizTab />}
          {activeTab === "ask"       && <AskTab />}
          {activeTab === "summarize" && <SummarizeTab />}
        </div>

      </main>
    </div>
  );
}

export default AI;
