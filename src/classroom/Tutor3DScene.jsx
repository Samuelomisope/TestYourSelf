import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AnimationMixer, Box3, LoopOnce } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { modelAvailable, modelUrl } from "./avatarModel";
import { initialMotion, stepMotion, talkRhythm } from "./tutorMotion";
import { driveMouth, frameInterval, mouthCues, shouldDraw } from "./lipSync";
import { armAngles, EXPRESSION_NAMES, expressionTargets } from "./vrmMotion";
import { clipFor, faceWeights, framingFor, glbUrl } from "./glbModel";

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


// Sets the face shapes on every mesh that has them. Kept outside the component because it writes to Three.js objects.
function applyFace(meshes, weights) {
  for (const mesh of meshes) {
    for (const [name, weight] of Object.entries(weights)) {
      const index = mesh.morphTargetDictionary[name];
      if (index !== undefined) mesh.morphTargetInfluences[index] = weight;
    }
  }
}

// A Premium 3D lecturer from a GLB file (Classroom 2.1): body clips from the file, face shapes driven by the same speech
// cues as the other renderers. It loads in the background and the placeholder stays if the file is missing or fails.
function GlbCharacter({ url, state, cue, onReady, onError, onSize }) {
  const [model, setModel] = useState(null);
  const now = useRef(initialMotion());
  const rig = useRef({ mixer: null, actions: {}, current: null, faces: [], shot: null, lastCue: null });
  const callbacks = useRef({ onReady, onError, onSize });
  useEffect(() => { callbacks.current = { onReady, onError, onSize }; });

  useEffect(() => {
    let cancelled = false;
    new GLTFLoader().load(
      url,
      (gltf) => {
        if (cancelled) return;
        const scene = gltf.scene;
        const faces = [];
        scene.traverse((o) => {
          if (o.isMesh) o.frustumCulled = false; // skinned meshes can be wrongly culled when posed by clips
          if (o.isMesh && o.morphTargetDictionary && o.morphTargetInfluences) faces.push(o);
        });
        const mixer = new AnimationMixer(scene);
        const actions = Object.fromEntries(gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)]));
        if (!actions.Idle) { callbacks.current.onError?.(); return; }
        rig.current = { mixer, actions, current: null, faces, shot: null, lastCue: null };
        const size = new Box3().setFromObject(scene).getSize(scene.position.clone());
        callbacks.current.onSize?.(size.y);
        setModel(scene);
        callbacks.current.onReady?.();
      },
      undefined,
      () => { if (!cancelled) callbacks.current.onError?.(); },
    );
    return () => {
      cancelled = true;
      const { mixer } = rig.current;
      mixer?.stopAllAction();
      rig.current = { mixer: null, actions: {}, current: null, faces: [], shot: null, lastCue: null };
    };
  }, [url]);

  // Body clips: the base clip follows the state; a board event or praise plays one clip on top, then it returns.
  const cueType = cue?.type ?? null;
  const cueId = cue?.id ?? null;
  const wanted = useMemo(() => clipFor(state, cueType ? { type: cueType, id: cueId } : null), [state, cueType, cueId]);
  useEffect(() => {
    const r = rig.current;
    if (!model || !r.mixer) return undefined;
    const play = (name, { once = false } = {}) => {
      const next = r.actions[name];
      if (!next) return;
      const from = r.current;
      if (from === next && !once) return;
      next.reset().setEffectiveWeight(1);
      if (once) { next.setLoop(LoopOnce, 1); next.clampWhenFinished = true; }
      from?.crossFadeTo(next, 0.35, false);
      next.play();
      r.current = next;
    };
    const cueKey = cueType ? `${cueType}:${cueId}` : null;
    if (wanted.oneShot && r.actions[wanted.oneShot] && (state === "celebrating" || cueKey !== r.lastCue)) {
      r.lastCue = cueKey;
      play(wanted.oneShot, { once: true });
      const done = (event) => { if (event.action !== r.actions[wanted.oneShot]) return; r.mixer.removeEventListener("finished", done); play(wanted.base); };
      r.mixer.addEventListener("finished", done);
      return () => r.mixer?.removeEventListener("finished", done);
    }
    if (!wanted.oneShot) r.lastCue = cueKey;
    play(wanted.base);
    return undefined;
  }, [model, wanted, state, cueType, cueId]);

  useFrame(({ clock }, delta) => {
    const r = rig.current;
    if (!model || !r.mixer) return;
    r.mixer.update(delta);
    const mouthNow = mouthFor(state, clock.elapsedTime);
    const v = stepMotion(now.current, state, delta, clock.elapsedTime, mouthNow.amount);
    const weights = faceWeights({ state, blink: v.blink, mouth: mouthNow });
    applyFace(r.faces, weights);
  });

  return model ? <primitive object={model} /> : null;
}

// Where the camera looks: the whole placeholder, or the head and chest of a real model (which is about 1.6 units tall).
function Framing({ modelled, height }) {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    if (modelled && height) { const f = framingFor(height); camera.position.set(0, f.y + 0.02, f.distance); camera.lookAt(0, f.y - 0.1, 0); }
    else if (modelled) { camera.position.set(0, 1.3, 1.9); camera.lookAt(0, 1.18, 0); }
    else { camera.position.set(0, 0.85, 6.4); camera.lookAt(0, 0.85, 0); }
    camera.updateProjectionMatrix();
  }, [camera, modelled, height]);
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
export default function Tutor3DScene({ state, variant, cue = null, onFail }) {
  const [source, setSource] = useState(null); // { kind: "glb" | "vrm", url } once a file is known to exist
  const [ready, setReady] = useState(false);
  const [broken, setBroken] = useState(false);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const glb = glbUrl(variant);
      const vrm = modelUrl(variant);
      if (await modelAvailable(glb)) { if (!cancelled) setSource({ kind: "glb", url: glb }); return; }
      if (await modelAvailable(vrm) && !cancelled) setSource({ kind: "vrm", url: vrm });
    })();
    return () => { cancelled = true; setSource(null); setReady(false); setBroken(false); setHeight(0); };
  }, [variant]);
  const modelled = !!source && ready && !broken;
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
      <ambientLight intensity={source?.kind === "glb" ? 1.15 : 0.9} />
      <directionalLight position={[2, 3, 4]} intensity={source?.kind === "glb" ? 3 : 1.6} color={source?.kind === "glb" ? "#fff1e0" : "#ffffff"} />
      {source?.kind === "glb" && <><directionalLight position={[-3, 1.5, 2.5]} intensity={1} color="#c7d6ff" /><directionalLight position={[-2, 2, -3]} intensity={1.4} color="#8f7bff" /></>}
      <FrameLimiter />
      <Framing modelled={modelled} height={source?.kind === "glb" ? height : 0} />
      {!modelled && <Character state={state} variant={variant} />}
      {source?.kind === "vrm" && !broken && <VrmCharacter key={source.url} url={source.url} state={state} onReady={() => setReady(true)} onError={() => setBroken(true)} />}
      {source?.kind === "glb" && !broken && <GlbCharacter key={source.url} url={source.url} state={state} cue={cue} onReady={() => setReady(true)} onError={() => setBroken(true)} onSize={setHeight} />}
    </Canvas>
  );
}
