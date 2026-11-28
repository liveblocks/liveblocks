"use client";

import { useCallback, useSyncExternalStore } from "react";
import { type Theme, THEMES } from "@/game/render/theme";

const KEY = "transport-game:theme";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Other tabs of the same browser follow along
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// Browsers can refuse access to localStorage, e.g. in private windows. The
// theme then just isn't remembered.
let fallback: string | null = null;

function read() {
  try {
    return window.localStorage.getItem(KEY) ?? fallback;
  } catch {
    return fallback;
  }
}

// The look of the map this player picked. It is a personal preference, kept
// in the browser rather than in Liveblocks Storage: players in the same
// room can each use their own.
export function useTheme(): [Theme, (theme: Theme) => void] {
  const id = useSyncExternalStore(subscribe, read, () => null);
  const setTheme = useCallback((theme: Theme) => {
    fallback = theme.id;
    try {
      window.localStorage.setItem(KEY, theme.id);
    } catch {
      // Not remembered, see above
    }
    listeners.forEach((listener) => listener());
  }, []);
  return [THEMES.find((theme) => theme.id === id) ?? THEMES[0], setTheme];
}
