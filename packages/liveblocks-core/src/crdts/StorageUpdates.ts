import type { LiveListUpdates } from "../crdts/LiveList";
import type { LiveMapUpdates } from "../crdts/LiveMap";
import type { LiveObjectUpdates } from "../crdts/LiveObject";
import type { LiveTextUpdates } from "../crdts/LiveText";
import type { Lson, LsonObject } from "../crdts/Lson";

export type StorageCallback = (updates: StorageUpdate[]) => void;

export type LiveMapUpdate = LiveMapUpdates<string, Lson>;
export type LiveObjectUpdate = LiveObjectUpdates<LsonObject>;
export type LiveListUpdate = LiveListUpdates<Lson>;
export type LiveTextUpdate = LiveTextUpdates;

/**
 * Where a Storage update came from.
 *
 * Updates with `origin: "remote"` were made by another client (or by the
 * server), and reached this client over the network. Updates with
 * `origin: "local"` were made by this client, and `via` says how: a regular
 * edit, or a replay from the undo/redo history.
 */
export type StorageUpdateSource =
  | { origin: "remote" }
  | { origin: "local"; via: "edit" | "undo" | "redo" };

/**
 * The payload of notifications sent (in-client) when LiveStructures change.
 * Messages of this kind are not originating from the network, but are 100%
 * in-client.
 *
 * Updates delivered through `room.subscribe` may carry
 * `source` to distinguish where a mutation came from.
 * Undo/redo replays use `via: "undo"` or `via: "redo"`.
 */
export type StorageUpdate = (
  | LiveMapUpdate
  | LiveObjectUpdate
  | LiveListUpdate
  | LiveTextUpdate
) & {
  source?: StorageUpdateSource;
};
