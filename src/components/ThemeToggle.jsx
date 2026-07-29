import { Sun, Moon, Monitor, BookOpen } from "lucide-react";
import { useDarkMode } from "../DarkModeContext.jsx";

const OPTIONS = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "sepia", icon: BookOpen, label: "Sepia" },
  { value: "system", icon: Monitor, label: "System" },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useDarkMode();

  return (
    <div className="flex items-center gap-1 rounded-lg bg-ink/[0.03] p-1">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          aria-label={label}
          title={label}
          className={`p-1.5 rounded-md transition-colors ${
            theme === value
              ? "bg-violet-500/20 text-violet-400"
              : "text-ink/40 hover:text-ink/70"
          }`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
