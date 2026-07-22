"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

type Theme = "light" | "dark" | "system";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: "light" | "dark";
}>({ theme: "system", setTheme: () => {}, resolved: "light" });

const THEME_EVENT = "packex-theme";

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_EVENT, callback);
  };
}

function getStoredTheme(): Theme {
  const stored = localStorage.getItem("packex-theme");
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

function getServerTheme(): Theme {
  return "system";
}

function subscribeSystem(callback: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSystemResolved(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getServerResolved(): "light" | "dark" {
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getStoredTheme, getServerTheme);
  const systemResolved = useSyncExternalStore(
    subscribeSystem,
    getSystemResolved,
    getServerResolved,
  );
  const resolved = theme === "system" ? systemResolved : theme;

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem("packex-theme", next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
