import type { LiveListUpdates } from "../crdts/LiveList.js";
import type { LiveMapUpdates } from "../crdts/LiveMap.js";
import type { LiveObjectUpdates } from "../crdts/LiveObject.js";
import type { Lson, LsonObject } from "../crdts/Lson.js";

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
