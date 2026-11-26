// Formatting for the Premium payment list and printable receipt. Pure, so it can be tested without a browser.

export function formatMoney(amount, currency = "NGN") {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "";
  const text = value.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return currency === "NGN" ? `₦${text}` : `${currency} ${text}`;
}

export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
}

/** Keeps only well formed rows from the server and sorts newest first, so a bad row cannot break the page. */
export function cleanPayments(payload) {
  const rows = Array.isArray(payload?.payments) ? payload.payments : [];
  return rows
    .filter((row) => row && typeof row.reference === "string" && Number.isFinite(Number(row.amount)) && !Number.isNaN(new Date(row.paidAt).getTime()))
    .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
}

/** The first line of a reference is enough to recognise a payment; the full one stays on the receipt. */
export function shortReference(reference) {
  const text = String(reference || "");
  return text.length > 16 ? `${text.slice(0, 11)}…${text.slice(-4)}` : text;
}
