"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ThemeMode = "system" | "light" | "dark";

const KEY = "theme";
const EVENT = "kanban-theme-change";
const ORDER: ThemeMode[] = ["system", "light", "dark"];

function read(): ThemeMode {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export const nextTheme = (mode: ThemeMode): ThemeMode => ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];

function apply(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "system") delete root.dataset.theme;
  else root.dataset.theme = mode;
}

/** The chosen theme: follow the system, or force light or dark. Remembered between visits. */
export function useTheme() {
  const mode = useSyncExternalStore(subscribe, read, () => "system" as ThemeMode);

  const setMode = useCallback((next: ThemeMode) => {
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      /* storage may be blocked: the choice then lasts until the page is closed */
    }
    apply(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const cycle = useCallback(() => setMode(nextTheme(read())), [setMode]);

  return { mode, setMode, cycle };
}
