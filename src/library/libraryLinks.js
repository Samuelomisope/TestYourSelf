export const REPORT_REASONS = [
  { value: "BROKEN_FILE", label: "The file won't open or is damaged" },
  { value: "WRONG_COURSE", label: "It's filed under the wrong course" },
  { value: "DUPLICATE", label: "It's a duplicate of another file" },
  { value: "INAPPROPRIATE", label: "It's inappropriate" },
  { value: "OTHER", label: "Something else" },
];

/** A link that opens this material straight away for anyone who can see it. */
export function shareUrl(origin, id) {
  return `${String(origin || "").replace(/\/+$/, "")}/study-material?open=${encodeURIComponent(id)}`;
}

export function openedLabel(count) {
  const n = Number(count) || 0;
  if (n <= 0) return "";
  return n === 1 ? "Opened once" : `Opened ${n.toLocaleString("en-US")} times`;
}

/** "Found inside" text for a search hit in the document body. */
export function snippetLabel(snippet) {
  const text = String(snippet || "").trim();
  return text ? `Found inside: ${text}` : "";
}
