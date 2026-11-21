// How a modelled (VRM) tutor is posed (Phase F). Pure, so the numbers can be checked without loading a model.
// VRM characters rest in a T-pose: arms straight out. Rotating an upper arm about z brings it down or up.

const clamp01 = (value) => (Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0);
const ARM_DOWN = 1.2; // radians below horizontal when the arm hangs at the side
const ARM_SWING = 2.5; // total travel from hanging to overhead

/** Upper-arm z rotations for a raise amount per arm (0 hanging, 1 overhead). The right arm mirrors the left. */
export function armAngles(left, right) {
  return { left: -ARM_DOWN + clamp01(left) * ARM_SWING, right: ARM_DOWN - clamp01(right) * ARM_SWING };
}

/**
 * Expression weights (0 to 1) for a state, using the standard VRM names. `mouth` is how open the mouth is (0 to 1),
 * `blink` is how closed the eyes are (0 to 1), `viseme` is the mouth shape (aa, ih, ou, ee or oh). Only weights that matter are returned.
 */
export function expressionTargets(state, mouth = 0, blink = 0, viseme = "aa") {
  const base = { idle: { relaxed: 0.25 }, thinking: { relaxed: 0.5 }, listening: { surprised: 0.2 }, celebrating: { happy: 1 }, paused: {} }[state] ?? {};
  const talking = state === "speaking" || state === "explaining";
  return {
    ...base,
    ...(talking ? { relaxed: 0.1, [MOUTH_SHAPES.includes(viseme) ? viseme : "aa"]: Math.min(0.7, clamp01(mouth)) } : {}),
    blink: state === "celebrating" ? 0 : clamp01(blink), // the happy expression already squints
  };
}

export const MOUTH_SHAPES = ["aa", "ih", "ou", "ee", "oh"];
export const EXPRESSION_NAMES = ["happy", "relaxed", "surprised", ...MOUTH_SHAPES, "blink"];
