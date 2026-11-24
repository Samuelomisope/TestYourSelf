// One place for how buttons and cards look. Pure strings, so the rules can be tested without rendering.

const BASE = "inline-flex items-center justify-center gap-2 font-semibold transition select-none disabled:cursor-not-allowed disabled:opacity-50";

export const BUTTON_VARIANTS = {
  primary: "bg-violet-600 text-white hover:bg-violet-500",
  secondary: "border border-line bg-transparent text-ink hover:border-violet-500/50 hover:bg-ink/5",
  danger: "border border-red-500/40 bg-transparent text-red-700 hover:bg-red-500/5 dark:text-red-400",
  ghost: "bg-transparent text-ink hover:bg-ink/5",
};

// Every size keeps a 44px touch target on phones. "sm" only trims the padding and text, not the height.
export const BUTTON_SIZES = {
  md: "min-h-11 rounded-xl px-5 text-sm",
  sm: "min-h-11 rounded-xl px-3 text-xs",
  lg: "min-h-12 rounded-xl px-6 text-base",
};

export function buttonClasses({ variant = "primary", size = "md", block = false, className = "" } = {}) {
  const v = BUTTON_VARIANTS[variant] ? variant : "primary";
  const s = BUTTON_SIZES[size] ? size : "md";
  return [BASE, BUTTON_VARIANTS[v], BUTTON_SIZES[s], block ? "w-full" : "", className].filter(Boolean).join(" ");
}

export const CARD_PADDING = { none: "", sm: "p-4", md: "p-5 sm:p-6", lg: "p-6 sm:p-8" };

export function cardClasses({ padding = "md", tone = "surface", className = "" } = {}) {
  const pad = padding in CARD_PADDING ? padding : "md";
  const toneClass = tone === "elevated" ? "border border-line bg-bg-elevated shadow-sm" : tone === "accent" ? "border border-violet-500/20 bg-violet-500/10" : "border border-line bg-surface";
  return ["rounded-2xl", toneClass, CARD_PADDING[pad], className].filter(Boolean).join(" ");
}
