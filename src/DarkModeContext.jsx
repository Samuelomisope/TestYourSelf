import { createContext, useContext, useState, useEffect, useCallback } from "react";

const DarkModeContext = createContext();

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme) {
  return theme === "system" ? getSystemTheme() : theme;
}

export function DarkModeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "system") return stored;

    // Migrate from the old boolean key so existing users keep their preference
    const legacy = localStorage.getItem("darkMode");
    if (legacy === "false") return "light";
    return "dark"; // preserves your old default-to-dark behavior
  });

  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(theme));

  // Apply theme + persist whenever `theme` changes
  useEffect(() => {
    const applied = resolveTheme(theme);
    setResolvedTheme(applied);
    document.documentElement.classList.toggle("dark", applied === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // If on "system", track OS preference changes live
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const applied = getSystemTheme();
      setResolvedTheme(applied);
      document.documentElement.classList.toggle("dark", applied === "dark");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  // --- Backward-compatible API for existing consumers ---
  const darkMode = resolvedTheme === "dark";
  const setDarkMode = useCallback((value) => {
    setTheme(value ? "dark" : "light");
  }, []);

  return (
    <DarkModeContext.Provider
      value={{ theme, setTheme, resolvedTheme, darkMode, setDarkMode }}
    >
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  return useContext(DarkModeContext);
}