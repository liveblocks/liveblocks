import type { LiveListUpdates } from "../crdts/LiveList";
import type { LiveMapUpdates } from "../crdts/LiveMap";
import type { LiveObjectUpdates } from "../crdts/LiveObject";
import type { LiveTextUpdates } from "../crdts/LiveText";
import type { Lson, LsonObject } from "../crdts/Lson";
import { kStorageUpdateSource } from "../internal";

export type StorageCallback = (updates: StorageUpdate[]) => void;

export type LiveMapUpdate = LiveMapUpdates<string, Lson>;
export type LiveObjectUpdate = LiveObjectUpdates<LsonObject>;
export type LiveListUpdate = LiveListUpdates<Lson>;
export type LiveTextUpdate = LiveTextUpdates;

export type StorageUpdateSource =
  | { origin: "remote" }
  | { origin: "local"; via: "mutation" }
  | { origin: "local"; via: "history"; action: "undo" | "redo" };

/**
 * The payload of notifications sent (in-client) when LiveStructures change.
 * Messages of this kind are not originating from the network, but are 100%
 * in-client.
 *
 * Updates delivered through `room.subscribe` may carry
 * `[kStorageUpdateSource]` to distinguish where a mutation came from.
 * Undo/redo replays use `via: "history"` with `action: "undo" | "redo"`.
 */
export type StorageUpdate = (
  | LiveMapUpdate
  | LiveObjectUpdate
  | LiveListUpdate
  | LiveTextUpdate
) & {
  [kStorageUpdateSource]?: StorageUpdateSource;
};
