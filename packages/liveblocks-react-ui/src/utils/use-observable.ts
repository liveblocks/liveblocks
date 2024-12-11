import type { Observable } from "@liveblocks/core";
import { useEffect } from "react";

import { useLatest } from "./use-latest";

export function useObservable<T>(
  observable: Observable<T>,
  callback: () => void
) {
  const latestCallback = useLatest(callback);

  useEffect(() => {
    const unsubscribe = observable.subscribe(() => latestCallback.current());

    return unsubscribe;
  }, [observable, latestCallback]);
}
