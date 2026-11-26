// Which tutor to show: the 3D one or the lightweight 2D one (Phase F). A pure decision so every rule is tested.
//
// The 3D tutor needs: a premium account (your plan), WebGL, and a student who has not asked for reduced motion.
// On phones and data saver it starts as 2D to save battery and data, unless the student picked 3D themselves.

/**
 * @param {object} input
 * @param {boolean} input.premium     the account may use the 3D tutor
 * @param {boolean} input.webgl       this browser can draw WebGL
 * @param {boolean} input.reducedMotion  the student asked for less motion
 * @param {boolean} input.saveData    the browser asks to save data
 * @param {boolean} input.smallScreen a phone-sized screen
 * @param {string}  input.preference  "auto" | "2d" | "3d" (the student's own choice)
 * @returns {{ mode: "2d" | "3d", reason: string, canChoose: boolean }}
 */
export function chooseRenderer(input) {
  const { premium = false, webgl = false, reducedMotion = false, saveData = false, smallScreen = false, preference = "auto" } = input ?? {};
  const canChoose = !!premium && !!webgl && !reducedMotion;
  const decide = (mode, reason) => ({ mode, reason, canChoose });
  if (!premium) return decide("2d", "premium");
  if (!webgl) return decide("2d", "webgl");
  if (reducedMotion) return decide("2d", "motion");
  if (preference === "2d") return decide("2d", "choice");
  if (preference === "3d") return decide("3d", "choice");
  if (saveData) return decide("2d", "data");
  if (smallScreen) return decide("2d", "mobile");
  return decide("3d", "auto");
}
