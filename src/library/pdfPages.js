// Pure helpers for the in-app PDF viewer.

/** Scale that makes a page fit the container width, never below a readable minimum and capped for sharpness. */
export function fitScale(pageWidth, containerWidth, { min = 0.5, max = 3 } = {}) {
  if (!(pageWidth > 0) || !(containerWidth > 0)) return 1;
  return Math.min(max, Math.max(min, containerWidth / pageWidth));
}

/** Which pages should be drawn: those near the viewport. visible is a Set of page numbers (1-based). */
export function pagesToRender(visible, total, buffer = 1) {
  const out = new Set();
  for (const page of visible) {
    for (let p = page - buffer; p <= page + buffer; p += 1) if (p >= 1 && p <= total) out.add(p);
  }
  return out;
}

/** Which kinds of file the in-app viewer can show. Everything else opens in the browser or downloads. */
export function canViewInApp(fileType) {
  const t = String(fileType || "").toLowerCase();
  return t === "pdf" || t === "application/pdf";
}

/** The material's own file name for an offline copy, safe for the download attribute. */
export function downloadName(title, fileType) {
  const base = String(title || "material").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 100) || "material";
  return canViewInApp(fileType) && !/\.pdf$/i.test(base) ? `${base}.pdf` : base;
}
