import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { API } from "./config";

// Public page opened from the link in study reminder emails. The signed token in the link is the only credential.
export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState(token ? "working" : "invalid");

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    fetch(`${API}/email/unsubscribe`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then((res) => { if (!cancelled) setState(res.ok ? "done" : res.status === 400 ? "invalid" : "error"); })
      .catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, [token]);

  const copy = {
    working: ["Updating your email settings…", ""],
    done: ["You are unsubscribed", "You will not get study reminder emails any more. You can turn them back on any time from your profile."],
    invalid: ["This link is not valid", "It may have expired or been copied incompletely. Sign in and use the switch on your profile to manage reminder emails."],
    error: ["We could not update your settings", "Please check your connection and open the link from the email again."],
  }[state];

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-ink">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-center" role="status" aria-live="polite">
        <h1 className="text-lg font-semibold">{copy[0]}</h1>
        {copy[1] && <p className="mt-2 text-sm text-muted">{copy[1]}</p>}
        <Link to="/profile" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-500 px-5 text-sm font-semibold text-white">Go to my profile</Link>
      </div>
    </main>
  );
}
