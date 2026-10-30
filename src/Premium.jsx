import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCrown, faSpinner } from "@fortawesome/free-solid-svg-icons";
import Navbar from "./Navbar";
import { apiGet, apiPost } from "./api";

export default function Premium() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (reference) {
          setMessage("Confirming your payment securely…");
          await apiPost("/billing/verify", { reference });
          if (!cancelled) setMessage("Payment confirmed. Premium is active on your account.");
        }
        const nextStatus = await apiGet("/billing/status");
        if (!cancelled) setStatus(nextStatus);
      } catch {
        if (!cancelled) setMessage("We could not confirm the payment yet. If you were charged, please contact support before paying again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reference]);

  const startCheckout = async () => {
    setOpeningCheckout(true);
    setMessage("");
    try {
      const checkout = await apiPost("/billing/checkout", {});
      window.location.assign(checkout.authorizationUrl);
    } catch {
      setMessage("Checkout is not available yet. Please try again later.");
      setOpeningCheckout(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 pt-36 pb-16">
        <section className="rounded-3xl border border-violet-500/20 bg-bg-elevated p-6 sm:p-10 shadow-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-sm text-violet-300">
            <FontAwesomeIcon icon={faCrown} /> UniLib Premium
          </div>
          <h1 className="mt-5 text-3xl sm:text-4xl font-black">Study with more AI support</h1>
          <p className="mt-3 text-ink/60 leading-relaxed">
            Premium is planned to include a higher monthly AI allowance and advanced AI study tools. The library and core study access remain free.
          </p>

          <div className="mt-8 rounded-2xl border border-ink/10 bg-white/[0.03] p-5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black">₦2,000</span>
              <span className="text-ink/50">/ month</span>
            </div>
            <p className="mt-1 text-sm text-ink/45">Monthly recurring subscription. Manage or cancel according to the subscription instructions provided at checkout.</p>
            <ul className="mt-5 space-y-3 text-sm text-ink/70">
              {["Higher monthly AI allowance", "Advanced AI study tools", "Free access to the library and core study features"].map((item) => (
                <li key={item} className="flex gap-3"><FontAwesomeIcon className="mt-1 text-emerald-400" icon={faCheck} /><span>{item}</span></li>
              ))}
            </ul>
          </div>

          {message && <p role="status" className="mt-5 rounded-xl bg-white/5 p-3 text-sm text-ink/70">{message}</p>}
          <div className="mt-6">
            {loading ? (
              <div className="text-sm text-ink/50"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Loading subscription status…</div>
            ) : status?.isPremium ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300">
                Premium is active{status.premiumUntil ? ` until ${new Date(status.premiumUntil).toLocaleDateString()}` : " on your account"}.
              </div>
            ) : status?.checkoutAvailable ? (
              <button onClick={startCheckout} disabled={openingCheckout} className="w-full rounded-xl bg-violet-600 px-5 py-3 font-bold text-white transition hover:bg-violet-500 disabled:opacity-60">
                {openingCheckout ? <><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Opening secure checkout…</> : "Subscribe securely with Paystack"}
              </button>
            ) : (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                Premium checkout is not open yet. We’re finishing the subscription and AI allowance setup.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
