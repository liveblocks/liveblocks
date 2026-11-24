"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether a CSS media query currently matches. `false` during server
 * rendering and the first client render, so markup stays consistent.
 */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

// Tailwind's `xl` breakpoint, where the details panel docks beside the thread.
export const XL_BREAKPOINT = "(min-width: 80rem)";
