/** Whether this browser can create a WebGL context. Browser-only; a failed or blocked context counts as "no". */
export function detectWebGL() {
  try {
    if (typeof document === "undefined") return false;
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    const ok = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch { return false; }
}
