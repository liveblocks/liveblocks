import { useSyncExternalStore } from "react";

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const query = window.matchMedia("(max-width: 1024px)");

  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getSnapshot() {
  if (typeof window === "undefined") return () => {};

  const query = window.matchMedia("(max-width: 1024px)");
  return query.matches;
}
