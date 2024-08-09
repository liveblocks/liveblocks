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
    function handler(event: Event | SkipToEvent) {
      const customEvent = event as SkipToEvent;
      callback(customEvent.detail.timePercentage);
    }

    window.addEventListener(SKIP_TO_EVENT_NAME, handler);

    return () => {
      window.removeEventListener(SKIP_TO_EVENT_NAME, handler);
    };
  }, [callback]);
}
