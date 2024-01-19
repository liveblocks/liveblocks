import { useCallback, useRef } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

export default function useIsOnline() {
  const isOnlineRef = useRef(true);

  /**
   * Note: There is a 'navigator.onLine' property that can be used to determine the online status of the browser, but it is not reliable (see https://bugs.chromium.org/p/chromium/issues/detail?id=678075).
   */
  const subscribe = useCallback((onStoreChange: () => void) => {
    function handleIsOnline() {
      isOnlineRef.current = true;
      onStoreChange();
    }

    function handleIsOffline() {
      isOnlineRef.current = false;
      onStoreChange();
    }

    window.addEventListener("online", handleIsOnline);
    window.addEventListener("offline", handleIsOffline);
    return () => {
      window.removeEventListener("online", handleIsOnline);
      window.removeEventListener("offline", handleIsOffline);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    return isOnlineRef.current;
  }, []);

  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return isOnline;
}
