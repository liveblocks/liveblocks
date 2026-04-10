import { isLiveStructure } from "./crdts/liveblocks-helpers";
import type { Lson } from "./crdts/Lson";
import type { Json } from "./lib/Json";

export type { SyncConfig, SyncMode } from "./crdts/reconcile";
export { reconcileLiveObject } from "./crdts/reconcile";

/**
 * Converts any Lson value to its Json equivalent. Live structures are
 * converted via .toJSON(), plain values pass through as-is.
 */
export function lsonToJson(value: Lson): Json {
  if (isLiveStructure(value)) {
    return value.toJSON() as Json;
  }
  return value;
}
