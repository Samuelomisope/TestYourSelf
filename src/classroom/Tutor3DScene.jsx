import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { approach, motionTargets, talkRhythm } from "./tutorMotion";

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
  const now = useRef({ headTilt: 0, armLeft: 0, armRight: 0, mouth: 0.08, eyes: 1 });
  const female = variant !== "MALE";

  useFrame(({ clock }, delta) => {
    const target = motionTargets(state);
    const t = clock.elapsedTime;
    const v = now.current;
    v.headTilt = approach(v.headTilt, target.headTilt, delta);
    v.armLeft = approach(v.armLeft, target.armLeft, delta, 6);
    v.armRight = approach(v.armRight, target.armRight, delta, 6);
    v.eyes = approach(v.eyes, target.eyes, delta, 14);
    v.mouth = approach(v.mouth, target.talking ? 0.1 + 0.6 * talkRhythm(t) : target.mouth, delta, 18);
    // A blink every few seconds.
    const blink = t % 4.2 > 4.05 ? 0.1 : 1;
    root.current.position.y = Math.sin(t * 1.4) * target.bob;
    head.current.rotation.z = v.headTilt;
    armLeft.current.rotation.z = v.armLeft * Math.PI * 0.95;
    armRight.current.rotation.z = -v.armRight * Math.PI * 0.95;
    mouth.current.scale.set(1, 0.4 + v.mouth * 1.6, 1);
    eyes.current.scale.set(1, Math.max(0.1, v.eyes * blink), 1);
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

/** The 3D scene. `onFail` is called if the graphics context is lost, so the page can fall back to the 2D tutor. */
export default function Tutor3DScene({ state, variant, onFail }) {
  return (
    <Canvas
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
      <Character state={state} variant={variant} />
    </Canvas>
  );
}
