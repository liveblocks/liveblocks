import type { EventSource } from "@liveblocks/core";
import { useEffect } from "react";

import { useLatest } from "./use-latest";

export function useEventSource<T>(
  eventSource: EventSource<T>,
  callback: () => void
) {
  const latestCallback = useLatest(callback);

  useEffect(() => {
    const unsubscribe = eventSource.subscribe(() => latestCallback.current());

    return unsubscribe;
  }, [eventSource, latestCallback]);
}
