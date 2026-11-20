// Where the modelled tutors live and whether to trust a file before loading it (Phase F). Models are plain files in
// /public/tutors, so adding or replacing a tutor needs no code change. A missing file is normal: the placeholder shows.

export const MAX_MODEL_BYTES = 12 * 1024 * 1024;

/** The URL of the model for a tutor variant (FEMALE or MALE). */
export const modelUrl = (variant) => `/tutors/${variant === "MALE" ? "male" : "female"}.vrm`;

/**
 * Whether the model file exists and looks reasonable: a successful non-HTML response (a missing file on a single-page
 * app often answers with the HTML page) that is not larger than `maxBytes`. Never throws.
 */
export async function modelAvailable(url, fetchFn = globalThis.fetch, maxBytes = MAX_MODEL_BYTES) {
  try {
    const response = await fetchFn(url, { method: "HEAD" });
    if (!response?.ok) return false;
    const type = String(response.headers?.get?.("content-type") ?? "").toLowerCase();
    if (type.includes("text/html")) return false;
    const length = Number(response.headers?.get?.("content-length"));
    return !(Number.isFinite(length) && length > maxBytes);
  } catch { return false; }
}
