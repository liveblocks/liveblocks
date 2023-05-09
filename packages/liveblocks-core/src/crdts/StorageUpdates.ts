import type { LiveListUpdates } from "../crdts/LiveList";
import type { LiveMapUpdates } from "../crdts/LiveMap";
import type { LiveObjectUpdates } from "../crdts/LiveObject";
import type { Lson, LsonObject } from "../crdts/Lson";

export type StorageCallback = (updates: StorageUpdate[]) => void;

export type LiveMapUpdate = LiveMapUpdates<string, Lson>;
export type LiveObjectUpdate = LiveObjectUpdates<LsonObject>;
export type LiveListUpdate = LiveListUpdates<Lson>;

/**
 * The payload of notifications sent (in-client) when LiveStructures change.
 * Messages of this kind are not originating from the network, but are 100%
 * in-client.
 */
export type StorageUpdate = LiveMapUpdate | LiveObjectUpdate | LiveListUpdate;
