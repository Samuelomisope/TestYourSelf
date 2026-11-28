// The Premium 3D lecturers (Classroom 2.1) are GLB files in /public/tutors, exported once from Ara 3D Gen and optimised.
// Everything here is pure, so the rules for which clip plays and how the face moves are tested without a graphics card.

/** The GLB file for a lecturer (FEMALE or MALE). */
export const glbUrl = (variant) => `/tutors/${variant === "MALE" ? "tunde" : "ada"}.glb`;

/** Our mouth shapes (from lipSync) and the matching shapes in the GLB. */
export const VISEME_MORPHS = { aa: "viseme_aa", ih: "viseme_I", ee: "viseme_E", oh: "viseme_O", ou: "viseme_U" };
const FACE_MORPHS = ["eyeBlinkLeft", "eyeBlinkRight", "eyeWideLeft", "eyeWideRight", "browInnerUp", "browOuterUpLeft", "browOuterUpRight", "mouthSmile", "jawOpen"];
export const DRIVEN_MORPHS = [...FACE_MORPHS, ...Object.values(VISEME_MORPHS)];

// The body clips exported with each lecturer, by the names inside the file.
export const CLIPS = { idle: "Idle", talk: "Talk with gestures", board: "Point at the board", praise: "Thumbs up" };

const BOARD_EVENTS = ["BOARD_BLOCK", "BOARD_PAGE"];

/**
 * Which body clip to play. `base` loops for as long as the state lasts; `oneShot` plays once on top of it and then the
 * lecturer goes back to the base clip. A new board event (a different `cue.id`) points at the board once.
 */
export function clipFor(state, cue = null) {
  const talking = state === "speaking" || state === "explaining";
  const base = talking ? CLIPS.talk : CLIPS.idle;
  if (state === "celebrating") return { base: CLIPS.idle, oneShot: CLIPS.praise };
  if (talking && cue && BOARD_EVENTS.includes(cue.type)) return { base, oneShot: CLIPS.board };
  return { base, oneShot: null };
}

const clamp01 = (n) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));

// Resting expression for each state: smile, raised inner brows, wide eyes.
const FACE_FOR_STATE = {
  idle: { smile: 0.3, brow: 0, wide: 0 },
  thinking: { smile: 0, brow: 0.35, wide: 0 },
  speaking: { smile: 0.18, brow: 0.08, wide: 0 },
  listening: { smile: 0.3, brow: 0.3, wide: 0.15 },
  explaining: { smile: 0.15, brow: 0.08, wide: 0 },
  celebrating: { smile: 0.85, brow: 0.35, wide: 0.15 },
  paused: { smile: 0.12, brow: 0, wide: 0 },
};

/**
 * The weight (0 to 1) of every face shape the code drives. `blink` is eye openness (1 open, near 0 closed, as in
 * stepMotion) and `mouth` is { viseme, amount } from the lip-sync cues. Shapes not in the result are left to the clips.
 */
export function faceWeights({ state = "idle", blink = 1, mouth = { viseme: "aa", amount: 0 } } = {}) {
  const look = FACE_FOR_STATE[state] ?? FACE_FOR_STATE.idle;
  const closed = clamp01((1 - blink) / 0.9);
  const amount = clamp01(mouth?.amount);
  const out = Object.fromEntries(DRIVEN_MORPHS.map((name) => [name, 0]));
  out.eyeBlinkLeft = closed;
  out.eyeBlinkRight = closed;
  out.eyeWideLeft = look.wide * (1 - closed);
  out.eyeWideRight = look.wide * (1 - closed);
  out.browInnerUp = look.brow;
  out.mouthSmile = look.smile * (1 - amount * 0.6); // an open mouth smiles less
  out.jawOpen = amount * 0.1;
  const shape = VISEME_MORPHS[mouth?.viseme] ?? VISEME_MORPHS.aa;
  out[shape] = amount * 0.65;
  return out;
}

/** Where the camera looks for a model of this height (metres): head and shoulders. */
export function framingFor(height) {
  const h = Number.isFinite(height) && height > 0.5 ? height : 1.7;
  return { y: h - 0.26, distance: 1.85 };
}
