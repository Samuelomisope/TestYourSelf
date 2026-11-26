// Small "NEW" pill and notification dot. They carry text or a label, never colour alone.
export function NewBadge({ className = "" }) {
  return (
    <span className={`inline-flex items-center rounded-full bg-violet-500 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-white ${className}`}>
      New
    </span>
  );
}

export function NewDot({ className = "" }) {
  return (
    <span role="img" aria-label="New" className={`block h-2.5 w-2.5 rounded-full bg-violet-400 ring-2 ring-bg ${className}`} />
  );
}
