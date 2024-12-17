import type { ISignal } from "@liveblocks/core";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

export function useSignal<T>(signal: ISignal<T>): T {
  return useSyncExternalStore(signal.subscribe, signal.get, signal.get);
}
