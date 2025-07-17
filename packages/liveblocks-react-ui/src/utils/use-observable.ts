import type { Observable } from "@liveblocks/core";
import { useLatest } from "@liveblocks/react/_private";
import { useEffect } from "react";

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
