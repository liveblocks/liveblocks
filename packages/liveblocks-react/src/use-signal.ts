import type { ISignal } from "@liveblocks/core";
import { MutableSignal } from "@liveblocks/core";

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
  if (signal instanceof MutableSignal) {
    throw new Error(
      "Using a mutable Signal with useSignal will likely not work as expected."
    );
  }
  return useSyncExternalStoreWithSelector(
    signal.subscribe,
    signal.get,
    signal.get,
    selector ?? (identity as (value: T) => V),
    isEqual
  );
}
