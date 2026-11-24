import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "./ui/Button.jsx";
import Card from "./ui/Card.jsx";
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
    done: ["You are unsubscribed", "You will not get study reminder emails any more. You can turn them back on any time from your settings."],
    invalid: ["This link is not valid", "It may have expired or been copied incompletely. Sign in and use the switch in your settings to manage reminder emails."],
    error: ["We could not update your settings", "Please check your connection and open the link from the email again."],
  }[state];

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-ink">
      <Card className="w-full max-w-sm text-center" role="status" aria-live="polite">
        <h1 className="text-lg font-semibold">{copy[0]}</h1>
        {copy[1] && <p className="mt-2 text-sm text-muted">{copy[1]}</p>}
        <Button to="/settings" className="mt-5">Go to my settings</Button>
      </Card>
    </main>
  );
}
