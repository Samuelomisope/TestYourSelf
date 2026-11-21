// How the animated tutor looks in each state (Phase F). Pure data, so every renderer (the 2D tutor now, the 3D one
// later) reads the same table and a state can never be left without a look.
import { TUTOR_STATES } from "./tutorState.js";

const POSES = {
  idle: { eyes: "open", brows: "flat", mouth: "smile", tilt: 0, arms: "down", accessory: "none" },
  thinking: { eyes: "up", brows: "raised", mouth: "small", tilt: -5, arms: "down", accessory: "dots" },
  speaking: { eyes: "open", brows: "flat", mouth: "talk", tilt: 0, arms: "down", accessory: "none" },
  listening: { eyes: "wide", brows: "raised", mouth: "smile", tilt: 7, arms: "down", accessory: "waves" },
  explaining: { eyes: "open", brows: "flat", mouth: "talk", tilt: -3, arms: "point", accessory: "none" },
  celebrating: { eyes: "happy", brows: "raised", mouth: "grin", tilt: 0, arms: "up", accessory: "sparkles" },
  paused: { eyes: "open", brows: "flat", mouth: "neutral", tilt: 0, arms: "down", accessory: "pause" },
};

/** The look for a tutor state; an unknown state looks like idle. */
export const poseFor = (state) => POSES[state] ?? POSES.idle;

export const POSE_STATES = Object.keys(POSES);
export const missingPoses = () => TUTOR_STATES.filter((state) => !POSES[state]);
