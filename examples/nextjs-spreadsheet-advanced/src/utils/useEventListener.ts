import { useCallback, useEffect, useRef } from "react";

export function useEventListener<T extends keyof DocumentEventMap>(
  type: T,
  callback: (event: DocumentEventMap[T]) => any,
  guard = true
) {
  const latestCallback = useRef(callback);

  const handleEvent = useCallback((event: DocumentEventMap[T]) => {
    latestCallback.current(event);
  }, []);

  useEffect(() => {
    latestCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!guard) return;

    console.log("subscribe");

    document.addEventListener(type, handleEvent);

    return () => {
      document.removeEventListener(type, handleEvent);
    };
  }, [type, handleEvent, guard]);
}
