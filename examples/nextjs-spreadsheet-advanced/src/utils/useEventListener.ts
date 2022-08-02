import { useCallback, useEffect, useRef } from "react";

export function useEventListener<T extends keyof DocumentEventMap>(
  type: T,
  callback: (event: DocumentEventMap[T]) => any
) {
  const latestCallback = useRef(callback);

  const handleEvent = useCallback((event: DocumentEventMap[T]) => {
    latestCallback.current(event);
  }, []);

  useEffect(() => {
    latestCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    document.addEventListener(type, handleEvent);

    return () => {
      document.removeEventListener(type, handleEvent);
    };
  }, [type, handleEvent]);
}
