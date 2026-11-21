import { NewDot } from "./NewBadge";
import { useOnboarding } from "./context";

// Re-opens the tour and What's new any time. Sits in the side menu on every page.
export default function HelpMenu({ onDone }) {
  const { startTour, openWhatsNew, unseen } = useOnboarding();
  const row = "flex min-h-11 w-full items-center justify-between rounded-xl px-4 text-left text-sm font-medium text-ink/50 transition hover:bg-white/5 hover:text-ink";
  return (
    <div className="px-4 pt-2" data-tour="side-help">
      <p className="mb-1 px-4 text-xs uppercase tracking-widest text-ink/30">Help</p>
      <button className={row} onClick={() => { onDone?.(); startTour(); }}>Take the app tour</button>
      <button className={row} onClick={() => { onDone?.(); openWhatsNew(); }}>
        <span>What's new</span>{unseen.length > 0 && <NewDot />}
      </button>
    </div>
  );
}
