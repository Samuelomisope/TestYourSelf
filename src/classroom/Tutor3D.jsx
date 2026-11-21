import { Component, lazy, Suspense } from "react";
import TutorAvatar2D from "./TutorAvatar2D";

// Three.js is a large library, so it is fetched only when a 3D tutor is actually shown.
const Scene = lazy(() => import("./Tutor3DScene"));

class Guard extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail?.(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** The 3D tutor with the 2D tutor standing in while it loads, and for good if loading or drawing fails. */
export default function Tutor3D({ state, variant, className = "", onFail }) {
  const flat = <TutorAvatar2D state={state} variant={variant} className={className} />;
  return (
    <div className={className} role="img" aria-label={`Animated 3D tutor: ${state}`}>
      <Guard fallback={flat} onFail={onFail}>
        <Suspense fallback={flat}><Scene state={state} variant={variant} onFail={onFail} /></Suspense>
      </Guard>
    </div>
  );
}
