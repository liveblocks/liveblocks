import { useCallback, useEffect } from "react";

type SkipToEvent = CustomEvent<{ timePercentage: number }>;
const SKIP_TO_EVENT_NAME = "skipTo";

export function useSkipTo() {
  return useCallback((timePercentage: number) => {
    const event: SkipToEvent = new CustomEvent(SKIP_TO_EVENT_NAME, {
      detail: { timePercentage },
    });

    window.dispatchEvent(event);
  }, []);
}

export function useSkipToListener(callback: (timePercentage: number) => void) {
  useEffect(() => {
    function handler(event: SkipToEvent) {
      callback(event.detail.timePercentage);
    }

    window.addEventListener(SKIP_TO_EVENT_NAME, handler as any);

    return () => {
      window.removeEventListener(SKIP_TO_EVENT_NAME, handler as any);
    };
  }, [callback]);
}

export function useKeyDownListener(
  callback: (keyboardEvent: KeyboardEvent) => void
) {
  useEffect(() => {
    window.addEventListener("keydown", callback);
    return () => {
      window.removeEventListener("keydown", callback);
    };
  }, [callback]);
}
