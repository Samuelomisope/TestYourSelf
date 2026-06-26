import { useEffect, useState, useContext, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRobot, faBookOpen, faStore, faLayerGroup,
} from '@fortawesome/free-solid-svg-icons';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const FEATURES = [
  { icon: <FontAwesomeIcon icon={faBookOpen} />, label: "Study Material", desc: "Upload and organise your course files" },
  { icon: <FontAwesomeIcon icon={faRobot} />, label: "AI Assistant", desc: "Ask questions, get summaries, generate quizzes" },
  { icon: <FontAwesomeIcon icon={faLayerGroup} />, label: "Flashcards", desc: "Create and review cards to retain more" },
  { icon: <FontAwesomeIcon icon={faStore} />, label: "Marketplace", desc: "Buy and sell materials with your campus" },
];

function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const buttonRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithGoogle } = useContext(AuthContext);

  const from = location.state?.from?.pathname || "/home";

  const handleCredentialResponse = async (response) => {
    try {
      setLoading(true);
      setError("");
      await loginWithGoogle(response.credential);
      navigate(from, { state: { fromLogin: true } });
    } catch (err) {
      console.error(err);
      setError("Failed to sign in. Please try again.");
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const tryInit = () => {
      if (cancelled) return;
      if (!window.google || !buttonRef.current) {
        setTimeout(tryInit, 100);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "filled_black",
        size: "large",
        width: 300,
        shape: "pill",
      });
    };
    tryInit();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-4 py-12 relative overflow-hidden">

      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
        <div className="absolute top-1/2 -right-20 w-72 h-72 bg-emerald-500 rounded-full opacity-[0.06] blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-pink-500 rounded-full opacity-[0.06] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* LEFT — branding + features */}
        <div className="flex flex-col justify-center gap-8 md:pr-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2">
              TEST<span className="text-violet-400">YOURSELF</span>
            </h1>
            <p className="text-white/40 text-sm leading-relaxed">
              Study smarter. Learn together. Test yourself daily.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {FEATURES.map((f) => (
              <div
                key={f.label}
                className="flex items-start gap-3 bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3"
              >
                <span className="text-xl mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white/80">{f.label}</p>
                  <p className="text-xs text-white/30 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — sign in card */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-6 shadow-2xl">

            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/25 rounded-full px-4 py-1.5 text-xs text-violet-400 font-medium mb-4">
                <span>✦</span>
                <span>Welcome back</span>
              </div>
              <h2 className="text-xl font-bold text-white">Sign in to continue</h2>
              <p className="text-xs text-white/30 mt-1">
                New here? Signing in creates your account automatically.
              </p>
            </div>

            {error && (
              <p className="text-red-400 text-xs text-center w-full bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                {error}
              </p>
            )}

            {loading ? (
              <div className="w-full h-12 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-white/40">Signing in…</p>
              </div>
            ) : (
              <div ref={buttonRef} className="w-full flex items-center justify-center" />
            )}

            <div className="w-full border-t border-white/5 pt-4 text-center">
              <p className="text-xs text-white/20">
                By signing in, you agree to our{" "}
                <a href="/terms" className="text-violet-400 hover:underline">Terms of Service</a>
                {" "}and{" "}
                <a href="/privacy" className="text-violet-400 hover:underline">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Watermark */}
      <div className="absolute bottom-4 left-0 w-full text-center pointer-events-none select-none">
        <p className="text-[10px] text-white/10 tracking-widest uppercase">© 2026 TestYourSelf</p>
      </div>
    </div>
  );
}

export default Login;
