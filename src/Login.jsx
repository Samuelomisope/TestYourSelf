import { useEffect, useState, useContext, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import login1 from "./assets/login1.webp";
import login2 from "./assets/login2.avif";
import login3 from "./assets/login3.webp";

const images = [login1, login2, login3];
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function Login() {
  const [currentImage, setCurrentImage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const buttonRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithGoogle } = useContext(AuthContext);

  const from = location.state?.from?.pathname || "/home";

  useEffect(() => {
    const twelveHours = 12 * 60 * 60 * 1000;
    const savedIndex = localStorage.getItem("imageIndex");
    if (savedIndex !== null) setCurrentImage(Number(savedIndex));

    const interval = setInterval(() => {
      setCurrentImage((prev) => {
        const next = (prev + 1) % images.length;
        localStorage.setItem("imageIndex", next);
        return next;
      });
    }, twelveHours);

    return () => clearInterval(interval);
  }, []);

  const handleCredentialResponse = async (response) => {
    try {
      setLoading(true);
      setError("");
      await loginWithGoogle(response.credential);
      navigate(from, { state: { fromLogin: true } });
    } catch (err) {
      console.error(err);
      setError("Failed to sign in with Google. Please try again.");
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
        theme: "outline",
        size: "large",
        width: 320,
        shape: "pill",
      });
    };

    tryInit();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex w-full bg-gray-100 min-h-screen">
      <div className="w-full md:inline-block hidden h-full relative">
        <img
          className="h-full w-full object-cover"
          src={images[currentImage]}
          alt="leftSideImage"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-transparent to-gray-100" />
      </div>
      <div className="h-screen border-l-2 border-gray-300" />

      <div className="w-full flex flex-col items-center justify-center space-y-6">
        <div className="md:w-96 w-80 flex flex-col items-center justify-center space-y-6">
          <h2
            style={{ fontFamily: "'Nunito', sans-serif" }}
            className="text-4xl text-indigo-500 font-bold"
          >
            TestYourSelf
          </h2>
          <p className="text-sm text-gray-500/90 mt-3">Study smarter, Learn together.</p>

          {error && (
            <p className="text-red-500 text-sm w-full text-center">{error}</p>
          )}

          {loading ? (
            <div className="w-full h-12 flex items-center justify-center">
              <p className="text-sm text-gray-500">Signing in...</p>
            </div>
          ) : (
            <div ref={buttonRef} className="w-full flex items-center justify-center" />
          )}

          <p className="text-gray-500/90 text-sm mt-4">
            Don't have an account? Signing in with Google creates one automatically.
          </p>
          <p className="text-gray-400 text-sm mt-6">
            By signing in, you agree to our{" "}
            <a href="/terms" className="text-indigo-400 hover:underline">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" className="text-indigo-400 hover:underline">Privacy Policy</a>.
          </p>
        </div>
        <div className="w-full border-t-2 border-gray-300" />
      </div>
    </div>
  );
}

export default Login;