import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("blur", callback);
  window.addEventListener("focus", callback);

  return () => {
    window.removeEventListener("blur", callback);
    window.removeEventListener("focus", callback);
  };
}

function getSnapshot() {
  return document.hasFocus();
}

function getServerSnapshot() {
  return true;
}

export function useWindowFocus() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
