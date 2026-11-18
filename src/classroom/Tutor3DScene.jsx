import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { modelAvailable, modelUrl } from "./avatarModel";
import { initialMotion, stepMotion, talkRhythm } from "./tutorMotion";
import { driveMouth, frameInterval, mouthCues, shouldDraw } from "./lipSync";
import { armAngles, EXPRESSION_NAMES, expressionTargets } from "./vrmMotion";

// What the mouth should do now: it follows the words the voice reports, or a talking rhythm when it reports none.
const mouthFor = (state, seconds) => driveMouth(mouthCues, performance.now() / 1000, state === "speaking" || state === "explaining", 0.1 + 0.6 * talkRhythm(seconds));

// The 3D tutor (Phase F). This file, and Three.js with it, is loaded only when a 3D tutor is shown. The character is
// built from simple shapes for now; a modelled character replaces <Character> without changing anything around it.
const SKIN = "#9a6240";
const SHIRT = "#7c3aed";
const HAIR = "#241a33";

function Character({ state, variant }) {
  const root = useRef();
  const head = useRef();
  const armLeft = useRef();
  const armRight = useRef();
  const mouth = useRef();
  const eyes = useRef();
  const now = useRef(initialMotion());
  const female = variant !== "MALE";

  useFrame(({ clock }, delta) => {
    const v = stepMotion(now.current, state, delta, clock.elapsedTime, mouthFor(state, clock.elapsedTime).amount);
    root.current.position.y = v.bob;
    head.current.rotation.z = v.headTilt;
    armLeft.current.rotation.z = v.armLeft * Math.PI * 0.95;
    armRight.current.rotation.z = -v.armRight * Math.PI * 0.95;
    mouth.current.scale.set(1, 0.4 + v.mouth * 1.6, 1);
    eyes.current.scale.set(1, Math.max(0.1, v.eyes * v.blink), 1);
  });

  return (
    <group ref={root}>
      <mesh position={[0, 0.2, 0]}><capsuleGeometry args={[0.72, 0.3, 8, 24]} /><meshStandardMaterial color={SHIRT} roughness={0.7} /></mesh>
      <mesh position={[0, 1.05, 0]}><cylinderGeometry args={[0.17, 0.2, 0.3, 16]} /><meshStandardMaterial color="#855334" /></mesh>
      <group ref={armLeft} position={[-0.8, 0.8, 0]}>
        <mesh position={[0, -0.45, 0]}><capsuleGeometry args={[0.15, 0.7, 6, 12]} /><meshStandardMaterial color={SHIRT} /></mesh>
        <mesh position={[0, -0.95, 0]}><sphereGeometry args={[0.17, 16, 16]} /><meshStandardMaterial color={SKIN} /></mesh>
      </group>
      <group ref={armRight} position={[0.8, 0.8, 0]}>
        <mesh position={[0, -0.45, 0]}><capsuleGeometry args={[0.15, 0.7, 6, 12]} /><meshStandardMaterial color={SHIRT} /></mesh>
        <mesh position={[0, -0.95, 0]}><sphereGeometry args={[0.17, 16, 16]} /><meshStandardMaterial color={SKIN} /></mesh>
      </group>
      <group ref={head} position={[0, 1.2, 0]}>
        {female && <mesh position={[0, -0.15, -0.18]} scale={[1.05, 1.25, 0.7]}><sphereGeometry args={[0.62, 24, 24]} /><meshStandardMaterial color={HAIR} /></mesh>}
        <mesh position={[0, 0.55, 0]}><sphereGeometry args={[0.6, 32, 32]} /><meshStandardMaterial color={SKIN} roughness={0.8} /></mesh>
        <mesh position={[0, 0.72, -0.04]} scale={[1.02, 0.85, 1.02]}><sphereGeometry args={[0.6, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.55]} /><meshStandardMaterial color={HAIR} /></mesh>
        <group ref={eyes} position={[0, 0.6, 0.52]}>
          <mesh position={[-0.2, 0, 0]}><sphereGeometry args={[0.07, 12, 12]} /><meshStandardMaterial color="#1f1630" /></mesh>
          <mesh position={[0.2, 0, 0]}><sphereGeometry args={[0.07, 12, 12]} /><meshStandardMaterial color="#1f1630" /></mesh>
        </group>
        <mesh ref={mouth} position={[0, 0.36, 0.55]}><sphereGeometry args={[0.1, 16, 16]} /><meshStandardMaterial color="#4a1d2a" /></mesh>
      </group>
    </group>
  );
}

// A modelled tutor from a VRM file in /public/tutors. It loads in the background: the placeholder stays until the model
// is ready, and stays for good if the file is missing or fails to load.
function VrmCharacter({ url, state, onReady, onError }) {
  const [vrm, setVrm] = useState(null);
  const now = useRef(initialMotion());
  const callbacks = useRef({ onReady, onError });
  useEffect(() => { callbacks.current = { onReady, onError }; });

  useEffect(() => {
    let cancelled = false;
    let loaded = null;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      url,
      (gltf) => {
        const model = gltf.userData.vrm;
        if (!model) { callbacks.current.onError?.(); return; }
        if (cancelled) { VRMUtils.deepDispose(model.scene); return; }
        VRMUtils.rotateVRM0(model); // old-format models face the other way
        loaded = model;
        setVrm(model);
        callbacks.current.onReady?.();
      },
      undefined,
      () => { if (!cancelled) callbacks.current.onError?.(); },
    );
    return () => { cancelled = true; if (loaded) VRMUtils.deepDispose(loaded.scene); };
  }, [url]);

  useFrame(({ clock }, delta) => {
    if (!vrm) return;
    const mouthNow = mouthFor(state, clock.elapsedTime);
    const v = stepMotion(now.current, state, delta, clock.elapsedTime, mouthNow.amount);
    const bone = (name) => vrm.humanoid?.getNormalizedBoneNode(name);
    const head = bone("head");
    if (head) head.rotation.z = v.headTilt;
    const arms = armAngles(v.armLeft, v.armRight);
    const left = bone("leftUpperArm");
    const right = bone("rightUpperArm");
    if (left) left.rotation.z = arms.left;
    if (right) right.rotation.z = arms.right;
    const weights = expressionTargets(state, v.mouth, 1 - v.blink, mouthNow.viseme);
    for (const name of EXPRESSION_NAMES) vrm.expressionManager?.setValue(name, weights[name] ?? 0);
    vrm.update(delta);
  });

  return vrm ? <primitive object={vrm.scene} /> : null;
}

// Where the camera looks: the whole placeholder, or the head and chest of a real model (which is about 1.6 units tall).
function Framing({ modelled }) {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    if (modelled) { camera.position.set(0, 1.3, 1.9); camera.lookAt(0, 1.18, 0); }
    else { camera.position.set(0, 0.85, 6.4); camera.lookAt(0, 0.85, 0); }
    camera.updateProjectionMatrix();
  }, [camera, modelled]);
  return null;
}

// Draws about 30 frames a second, and none while the tab is hidden or the tutor is scrolled out of view, so an idle
// lesson does not drain a phone. The canvas only redraws when asked (frameloop="demand").
function FrameLimiter({ fps = 30 }) {
  const invalidate = useThree((state) => state.invalidate);
  const element = useThree((state) => state.gl.domElement);
  useEffect(() => {
    let onScreen = true;
    const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; }) : null;
    observer?.observe(element);
    const timer = window.setInterval(() => { if (shouldDraw({ hidden: document.hidden, onScreen })) invalidate(); }, frameInterval(fps));
    invalidate();
    return () => { window.clearInterval(timer); observer?.disconnect(); };
  }, [fps, invalidate, element]);
  return null;
}

/** The 3D scene. `onFail` is called if the graphics context is lost, so the page can fall back to the 2D tutor. */
export default function Tutor3DScene({ state, variant, onFail }) {
  const [url, setUrl] = useState(null); // the model file, once it is known to exist
  const [ready, setReady] = useState(false);
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const wanted = modelUrl(variant);
    modelAvailable(wanted).then((ok) => { if (!cancelled && ok) setUrl(wanted); });
    return () => { cancelled = true; setUrl(null); setReady(false); setBroken(false); };
  }, [variant]);
  const modelled = !!url && ready && !broken;
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.85, 6.4], fov: 30 }}
      gl={{ antialias: true, powerPreference: "low-power" }}
      onCreated={({ gl, camera }) => {
        camera.lookAt(0, 0.85, 0); // frame the whole character (the default looks at the origin, which cuts off the head)
        gl.domElement.addEventListener("webglcontextlost", (event) => { event.preventDefault(); onFail?.(); });
      }}
      aria-label={`Animated 3D tutor: ${state}`}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 3, 4]} intensity={1.6} />
      <FrameLimiter />
      <Framing modelled={modelled} />
      {!modelled && <Character state={state} variant={variant} />}
      {url && !broken && <VrmCharacter key={url} url={url} state={state} onReady={() => setReady(true)} onError={() => setBroken(true)} />}
    </Canvas>
  );
}
