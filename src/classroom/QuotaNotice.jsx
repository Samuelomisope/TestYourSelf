import { Link } from "react-router-dom";
import { PREMIUM_CLASSROOM_BENEFITS, quotaKind, quotaNotice } from "./quota";

// Shows a plain error, or, when the server says a daily limit is reached, a clear message with the way forward.
export default function ErrorNotice({ error, premium }) {
  if (!error) return null;
  const notice = quotaNotice(quotaKind(error), premium);
  if (!notice) {
    return <p role="alert" className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>;
  }
  return (
    <section role="alert" className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
      <h3 className="font-semibold">{notice.title}</h3>
      <p className="mt-1 text-sm text-ink/70">{notice.body}</p>
      {notice.upsell && (
        <>
          <p className="mt-3 text-sm font-medium">With Premium:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink/70">
            {PREMIUM_CLASSROOM_BENEFITS.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <Link to="/premium?from=classroom" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-500">See Premium</Link>
        </>
      )}
    </section>
  );
}
