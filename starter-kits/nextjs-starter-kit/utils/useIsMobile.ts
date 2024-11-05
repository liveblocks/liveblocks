import { useSyncExternalStore } from "react";

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function subscribe(callback: () => void) {
  const query = window.matchMedia("(max-width: 1279px)");

  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getSnapshot() {
  const query = window.matchMedia("(max-width: 1279px)");
  return query.matches;
}
