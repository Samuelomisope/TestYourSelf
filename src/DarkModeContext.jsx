import { createContext, useContext, useState, useEffect, useCallback } from "react";

const DarkModeContext = createContext();

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme) {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyTheme(applied) {
  const root = document.documentElement;

  // dark mode uses a class (matches `@variant dark (&:where(.dark, .dark *))`)
  root.classList.toggle("dark", applied === "dark");

  // sepia uses a data attribute (matches `html[data-theme="sepia"]`)
  if (applied === "sepia") {
    root.setAttribute("data-theme", "sepia");
  } else {
    root.removeAttribute("data-theme");
  }
}

export function DarkModeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "sepia" || stored === "system") return stored;

    const legacy = localStorage.getItem("darkMode");
    if (legacy === "false") return "light";
    return "dark";
  });

  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(theme));

  // Recompute resolvedTheme whenever `theme` changes, apply class, persist
  useEffect(() => {
    const applied = resolveTheme(theme);
    setResolvedTheme(applied);
    applyTheme(applied);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // If on "system", track OS preference changes live
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const applied = getSystemTheme();
      setResolvedTheme(applied);
      applyTheme(applied);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

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
