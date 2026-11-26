import { poseFor } from "./tutorPose";

// The lightweight animated tutor (Phase F): plain SVG, no WebGL, a few kilobytes. It is the tutor for everyone, and
// the fallback whenever the 3D tutor cannot run. Motion is CSS (see index.css) and is switched off for students who
// prefer reduced motion, leaving the poses themselves, which still change with the state.
const SKIN = "#9a6240";
const SKIN_SHADE = "#855334";
const INK = "#1f1630";
const SHIRT = "#7c3aed";

function Eyes({ look }) {
  if (look === "happy") return <g fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round"><path d="M75 97 Q82 88 89 97" /><path d="M111 97 Q118 88 125 97" /></g>;
  const ry = look === "wide" ? 8 : 6;
  const rx = look === "wide" ? 5.5 : 4.5;
  const dy = look === "up" ? -3 : 0;
  const dx = look === "up" ? 2 : 0;
  return <g fill={INK} className="tutor-blink"><ellipse cx={82 + dx} cy={96 + dy} rx={rx} ry={ry} /><ellipse cx={118 + dx} cy={96 + dy} rx={rx} ry={ry} /></g>;
}

function Mouth({ look }) {
  const stroke = { fill: "none", stroke: INK, strokeWidth: 3.5, strokeLinecap: "round" };
  switch (look) {
    case "talk": return <ellipse cx="100" cy="117" rx="9" ry="6" fill="#4a1d2a" className="tutor-talk" />;
    case "grin": return <path d="M86 111 Q100 134 114 111 Z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />;
    case "small": return <ellipse cx="100" cy="118" rx="4" ry="3" fill="#4a1d2a" />;
    case "neutral": return <path d="M91 118 L109 118" {...stroke} />;
    default: return <path d="M87 113 Q100 125 113 113" {...stroke} />;
  }
}

function Arms({ look }) {
  const sleeve = { fill: "none", stroke: SHIRT, strokeWidth: 15, strokeLinecap: "round" };
  if (look === "point") return <g><path d="M160 190 Q184 160 190 128" {...sleeve} /><circle cx="190" cy="122" r="9" fill={SKIN} /></g>;
  if (look === "up") return <g className="tutor-cheer"><path d="M38 190 Q18 160 26 124" {...sleeve} /><path d="M162 190 Q182 160 174 124" {...sleeve} /><circle cx="26" cy="118" r="9" fill={SKIN} /><circle cx="174" cy="118" r="9" fill={SKIN} /></g>;
  return null;
}

function Accessory({ look }) {
  switch (look) {
    case "dots": return <g fill={SHIRT}>{[0, 1, 2].map((i) => <circle key={i} cx={128 + i * 14} cy={30 - i * 5} r="4.5" className="tutor-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}</g>;
    case "sparkles": return <g fill="#f59e0b" className="tutor-sparkle">{[[40, 36], [160, 30], [100, 14]].map(([x, y], i) => <path key={i} d={`M${x} ${y - 9} L${x + 3} ${y - 3} L${x + 9} ${y} L${x + 3} ${y + 3} L${x} ${y + 9} L${x - 3} ${y + 3} L${x - 9} ${y} L${x - 3} ${y - 3} Z`} />)}</g>;
    case "waves": return <g fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" className="tutor-waves"><path d="M164 84 Q172 96 164 108" /><path d="M172 76 Q184 96 172 116" /></g>;
    case "pause": return <g fill="#a78bfa"><rect x="150" y="22" width="7" height="22" rx="2" /><rect x="163" y="22" width="7" height="22" rx="2" /></g>;
    default: return null;
  }
}

/** The tutor for one state. `variant` is FEMALE or MALE (it only changes hair); the drawing is the same otherwise. */
export default function TutorAvatar2D({ state, variant = "FEMALE", className = "" }) {
  const pose = poseFor(state);
  const female = variant !== "MALE";
  return (
    <svg viewBox="0 0 200 220" role="img" aria-label={`Animated tutor: ${state}`} className={className} data-state={state}>
      <g className="tutor-sway">
        <path d="M30 220 C30 172 62 158 100 158 C138 158 170 172 170 220 Z" fill={SHIRT} />
        <Arms look={pose.arms} />
        <rect x="88" y="138" width="24" height="26" rx="8" fill={SKIN_SHADE} />
        <g style={{ transform: `rotate(${pose.tilt}deg)`, transformOrigin: "100px 140px", transition: "transform .35s ease" }}>
          {female && <path d="M48 96 C40 40 160 40 152 96 L158 150 C140 160 128 150 126 130 L74 130 C72 150 60 160 42 150 Z" fill="#241a33" />}
          <circle cx="52" cy="100" r="8" fill={SKIN_SHADE} /><circle cx="148" cy="100" r="8" fill={SKIN_SHADE} />
          <circle cx="100" cy="95" r="48" fill={SKIN} />
          <path d={female ? "M54 84 C58 52 142 46 148 84 C130 66 84 64 54 84 Z" : "M52 88 C50 48 150 44 148 88 C136 70 112 62 100 66 C84 62 64 70 52 88 Z"} fill="#241a33" />
          <g fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round">
            <path d={pose.brows === "raised" ? "M72 78 Q82 70 92 76" : "M72 80 L92 80"} />
            <path d={pose.brows === "raised" ? "M108 76 Q118 70 128 78" : "M108 80 L128 80"} />
          </g>
          <Eyes look={pose.eyes} />
          <Mouth look={pose.mouth} />
        </g>
      </g>
      <Accessory look={pose.accessory} />
    </svg>
  );
}
