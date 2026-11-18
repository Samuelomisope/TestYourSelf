// Numbers that move the 3D tutor (Phase F). Pure, so the motion rules are tested without a graphics card.
import { poseFor } from "./tutorPose.js";

const rad = (degrees) => (degrees * Math.PI) / 180;

/** Where each part of the character should be for a state: head tilt (radians), arm raise (0 down, 1 straight up), mouth and eye openness. */
export function motionTargets(state) {
  const pose = poseFor(state);
  return {
    headTilt: rad(pose.tilt),
    armLeft: pose.arms === "up" ? 0.9 : 0,
    armRight: pose.arms === "up" ? 0.9 : pose.arms === "point" ? 0.7 : 0,
    mouth: { smile: 0.08, neutral: 0.03, small: 0.12, talk: 0.45, grin: 0.8 }[pose.mouth] ?? 0.08,
    eyes: { open: 1, wide: 1.3, up: 1, happy: 0.35 }[pose.eyes] ?? 1,
    talking: pose.mouth === "talk",
    bob: state === "celebrating" ? 0.05 : state === "paused" ? 0 : 0.012,
  };
}

/** Moves `current` towards `target` smoothly and the same on fast or slow screens (frame time `dt` in seconds). */
export function approach(current, target, dt, speed = 8) {
  if (!Number.isFinite(current)) return Number.isFinite(target) ? target : 0;
  if (!Number.isFinite(target) || !Number.isFinite(dt) || dt <= 0) return current;
  return current + (target - current) * (1 - Math.exp(-speed * Math.min(dt, 0.1)));
}

/** A talking rhythm (0 to 1) for the mouth when no better signal exists. Two overlapping waves look less mechanical. */
export function talkRhythm(seconds) {
  const t = Number.isFinite(seconds) ? seconds : 0;
  return Math.min(1, Math.max(0, 0.5 + 0.32 * Math.sin(t * 13) + 0.18 * Math.sin(t * 7.3 + 1)));
}

export const initialMotion = () => ({ headTilt: 0, armLeft: 0, armRight: 0, mouth: 0.08, eyes: 1, blink: 1, bob: 0 });

/**
 * One animation step for a character, shared by every renderer: moves `values` towards what `state` asks for.
 * `seconds` is the clock, `delta` the frame time. Returns `values` (changed in place) for convenience.
 */
export function stepMotion(values, state, delta, seconds) {
  const target = motionTargets(state);
  values.headTilt = approach(values.headTilt, target.headTilt, delta);
  values.armLeft = approach(values.armLeft, target.armLeft, delta, 6);
  values.armRight = approach(values.armRight, target.armRight, delta, 6);
  values.eyes = approach(values.eyes, target.eyes, delta, 14);
  values.mouth = approach(values.mouth, target.talking ? 0.1 + 0.6 * talkRhythm(seconds) : target.mouth, delta, 18);
  values.blink = Number.isFinite(seconds) && seconds % 4.2 > 4.05 ? 0.1 : 1; // eye openness: a short blink every few seconds
  values.bob = Math.sin((Number.isFinite(seconds) ? seconds : 0) * 1.4) * target.bob;
  return values;
}
