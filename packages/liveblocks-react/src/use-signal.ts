import type { ISignal } from "@liveblocks/core";

import { useSyncExternalStoreWithSelector } from "./use-sync-external-store-with-selector";

const identity = <T>(value: T): T => value;

export function useSignal<T>(signal: ISignal<T>): T;
export function useSignal<T, V>(
  signal: ISignal<T>,
  selector: (value: T) => V,
  isEqual?: (a: V, b: V) => boolean
): V;
export function useSignal<T, V>(
  signal: ISignal<T>,
  selector?: (value: T) => V,
  isEqual?: (a: V, b: V) => boolean
): T | V {
  return useSyncExternalStoreWithSelector(
    signal.subscribe,
    signal.get,
    signal.get,
    selector ?? (identity as (value: T) => V),
    isEqual
  );
}
