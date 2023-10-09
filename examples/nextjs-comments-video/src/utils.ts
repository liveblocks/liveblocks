import { useCallback, useEffect } from "react";

type ThreadHighlightEvent = CustomEvent<{ threadId: string }>;
const THREAD_HIGHLIGHT_EVENT_NAME = "threadHighlight";

export function useHighlightThread(threadId: string) {
  return useCallback(() => {
    const event: ThreadHighlightEvent = new CustomEvent(
      THREAD_HIGHLIGHT_EVENT_NAME,
      {
        detail: { threadId },
      }
    );

    window.dispatchEvent(event);
  }, [threadId]);
}

export function useHighlightThreadListener(
  callback: (threadId: string) => void
) {
  useEffect(() => {
    function handler(event: ThreadHighlightEvent) {
      callback(event.detail.threadId);
    }

    window.addEventListener(THREAD_HIGHLIGHT_EVENT_NAME, handler as any);

    return () => {
      window.removeEventListener(THREAD_HIGHLIGHT_EVENT_NAME, handler as any);
    };
  }, [callback]);
}

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
