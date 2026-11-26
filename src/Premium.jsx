import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCrown, faPrint, faSpinner } from "@fortawesome/free-solid-svg-icons";
import Navbar from "./Navbar";
import Button from "./ui/Button.jsx";
import Card from "./ui/Card.jsx";
import { useModal } from "./ui/useModal.js";
import { apiGet, apiPost } from "./api";
import { PREMIUM_CLASSROOM_BENEFITS } from "./classroom/quota";
import { cleanPayments, formatDate, formatMoney, shortReference } from "./premium/receipt.js";

export default function Premium() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference");
  const fromClassroom = searchParams.get("from") === "classroom";
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [message, setMessage] = useState("");
  const [payments, setPayments] = useState([]);
  const [receipt, setReceipt] = useState(null);
  const modalRef = useModal(() => setReceipt(null), Boolean(receipt));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (reference) {
          setMessage("Confirming your payment securely…");
          const result = await apiPost("/billing/verify", { reference });
          if (!cancelled) {
            setMessage(result?.verified && result?.isPremium
              ? "Payment confirmed. Premium is active on your account."
              : "We have not received a successful payment for this checkout. If you cancelled, you can try again. If you were charged, wait a minute and refresh this page, or contact support before paying again.");
          }
        }
        const nextStatus = await apiGet("/billing/status");
        if (!cancelled) setStatus(nextStatus);
        // The history is a convenience: if it fails the page still works.
        apiGet("/billing/payments").then((data) => { if (!cancelled) setPayments(cleanPayments(data)); }).catch(() => {});
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
      <div className="print:hidden"><Navbar /></div>
      <main className="max-w-3xl mx-auto px-4 pt-36 pb-16 print:hidden">
        <Card as="section" tone="elevated" padding="lg" className="border-violet-500/20 shadow-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-sm text-violet-300">
            <FontAwesomeIcon icon={faCrown} /> UniLib Premium
          </div>
          <h1 className="mt-5 text-3xl sm:text-4xl font-black">Study with more AI support</h1>
          <p className="mt-3 text-ink/60 leading-relaxed">
            Premium gives you more room to learn with AI. The library and core study features stay free for everyone.
          </p>
          {fromClassroom && <p role="note" className="mt-3 rounded-xl bg-violet-500/10 p-3 text-sm text-violet-200">You reached a daily AI Classroom limit. Free limits reset every day, and Premium raises them.</p>}

          <div className="mt-8 rounded-2xl border border-ink/10 bg-white/[0.03] p-5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black">{formatMoney(status?.price ?? 2000, status?.currency || "NGN")}</span>
              <span className="text-ink/50">/ month</span>
            </div>
            <p className="mt-1 text-sm text-ink/45">Monthly recurring subscription. Manage or cancel according to the subscription instructions provided at checkout.</p>
            <ul className="mt-5 space-y-3 text-sm text-ink/85">
              {[...PREMIUM_CLASSROOM_BENEFITS, "Higher daily AI allowance", "Advanced AI study tools", "Free access to the library and core study features"].map((item) => (
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
              <Button block size="lg" onClick={startCheckout} loading={openingCheckout}>{openingCheckout ? "Opening secure checkout…" : "Subscribe securely with Paystack"}</Button>
            ) : (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                Premium checkout is not open yet. We’re finishing the subscription and AI allowance setup.
              </div>
            )}
          </div>
        </Card>

        {payments.length > 0 && (
          <Card as="section" tone="elevated" aria-labelledby="payments-heading" className="mt-8 print:hidden">
            <h2 id="payments-heading" className="text-lg font-bold">Your payments</h2>
            <ul className="mt-4 divide-y divide-ink/10">
              {payments.map((p) => (
                <li key={p.reference} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{formatMoney(p.amount, p.currency)} · {formatDate(p.paidAt)}</p>
                    <p className="truncate text-xs text-ink/60">Ref {shortReference(p.reference)}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setReceipt(p)}>
                    <FontAwesomeIcon icon={faPrint} aria-hidden="true" /> Receipt
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </main>

      {receipt && (
        <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="receipt-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:static print:block print:bg-white print:p-0">
          <div className="receipt-print w-full max-w-md rounded-2xl bg-bg-elevated p-6 text-ink shadow-xl print:max-w-none print:shadow-none">
            <h2 id="receipt-title" className="text-xl font-black">UniLib Premium receipt</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-ink/60">Amount</dt><dd className="font-semibold">{formatMoney(receipt.amount, receipt.currency)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink/60">Paid on</dt><dd className="font-semibold">{formatDate(receipt.paidAt)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink/60">Plan</dt><dd className="font-semibold">Premium, monthly</dd></div>
              <div><dt className="text-ink/60">Reference</dt><dd className="mt-1 break-all font-mono text-xs">{receipt.reference}</dd></div>
            </dl>
            <p className="mt-4 text-xs text-ink/60">Paid securely with Paystack. Keep this receipt for your records.</p>
            <div className="mt-6 flex gap-3 print:hidden">
              <Button autoFocus className="flex-1" onClick={() => window.print()}>Print or save as PDF</Button>
              <Button variant="secondary" onClick={() => setReceipt(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
