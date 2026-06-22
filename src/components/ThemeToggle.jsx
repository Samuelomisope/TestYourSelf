import { Sun, Moon, Monitor } from "lucide-react";
import { useDarkMode } from "../DarkModeContext.jsx";

const OPTIONS = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useDarkMode();

  return (
    <div className="flex items-center gap-1 rounded-lg bg-white/[0.03] p-1">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          aria-label={label}
          title={label}
          className={`p-1.5 rounded-md transition-colors ${
            theme === value
              ? "bg-violet-500/20 text-violet-400"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}