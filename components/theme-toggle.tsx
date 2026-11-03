"use client";

import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "theme";
const CHANGE_EVENT = "themechange";

function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    // Storage can be blocked (private mode, site data cleared).
    return null;
  }
}

function currentTheme(): Theme {
  const applied = document.documentElement.dataset.theme;
  if (applied === "light" || applied === "dark") return applied;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * Paper (light) is the design; dark is an optional reading mode (docs/04 §4).
 * Without JavaScript the page follows the system preference via CSS.
 */
export function ThemeToggle() {
  // null on the server, so the button renders disabled until hydrated.
  const theme = useSyncExternalStore<Theme | null>(
    subscribe,
    currentTheme,
    () => null,
  );

  useEffect(() => {
    const stored = readStoredTheme();
    if (stored) {
      document.documentElement.dataset.theme = stored;
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Still switches for this visit.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={theme === null}
      aria-pressed={theme === "dark"}
      className="text-muted hover:text-text min-h-11 cursor-pointer text-left font-sans text-sm underline-offset-4 hover:underline disabled:cursor-default"
    >
      Dark reading mode
    </button>
  );
}
