import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

export default function useIsDocumentVisible() {
  const isVisible = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return isVisible;
}

function subscribe(onStoreChange: () => void) {
  document.addEventListener("visibilitychange", onStoreChange);
  return () => {
    document.removeEventListener("visibilitychange", onStoreChange);
  };
}

function getSnapshot() {
  const isDocumentDefined = typeof document !== "undefined";
  return isDocumentDefined ? document.visibilityState === "visible" : true;
}
