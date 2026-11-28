"use client";

import { useCallback, useSyncExternalStore } from "react";

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

// Browsers can refuse access to localStorage, e.g. in private windows. What
// the player picked then just isn't remembered.
const fallback = new Map<string, string>();

// Something this player picked for themselves, like the look of the map. It
// is kept in the browser rather than in Liveblocks Storage: players in the
// same room can each have their own.
export function usePreference(
  key: string
): [string | null, (value: string) => void] {
  const read = useCallback(() => {
    try {
      return window.localStorage.getItem(key) ?? fallback.get(key) ?? null;
    } catch {
      return fallback.get(key) ?? null;
    }
  }, [key]);
  const value = useSyncExternalStore(subscribe, read, () => null);

  const set = useCallback(
    (next: string) => {
      fallback.set(key, next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Not remembered, see above
      }
      listeners.forEach((listener) => listener());
    },
    [key]
  );
  return [value, set];
}
