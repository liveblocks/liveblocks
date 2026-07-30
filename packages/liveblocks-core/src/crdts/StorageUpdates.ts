import type { LiveListUpdates } from "../crdts/LiveList";
import type { LiveMapUpdates } from "../crdts/LiveMap";
import type { LiveObjectUpdates } from "../crdts/LiveObject";
import type { LiveTextUpdates } from "../crdts/LiveText";
import type { Lson, LsonObject } from "../crdts/Lson";
import { freeze } from "../lib/freeze";

export type StorageCallback = (updates: StorageUpdate[]) => void;

export type LiveMapUpdate = LiveMapUpdates<string, Lson>;
export type LiveObjectUpdate = LiveObjectUpdates<LsonObject>;
export type LiveListUpdate = LiveListUpdates<Lson>;
export type LiveTextUpdate = LiveTextUpdates;

export type Via = "edit" | "undo" | "redo";

/**
 * type OpSource:
 *   Internal type for the source of an Op. Has an extra `optimistic` field
 *   that is not exposed publicly.
 *
 * type UpdateSource:
 *   Public type for the source of an Op.
 *
 * When applying an op to a CRDT, we need to know where it came from to apply
 * it correctly. The three cases are:
 *
 * - `{ origin: "local", optimistic: true }`: applied locally (an undo, redo, or
 *   reconnect replay), not yet acknowledged by the server. Will be sent to the
 *   server and needs to be tracked for conflict resolution.
 *
 * - `{ origin: "local", optimistic: false }`: received from the server, but
 *   originated from THIS client. The server echoed it back to confirm.
 *
 * - `{ origin: "remote" }`: received from the server, originated from another
 *   client. Apply it, unless there's a pending local op for the same key (local
 *   ops take precedence until acknowledged). Note that a "fix Op" sent by the
 *   server in response to a local mutation that caused a conflict is also
 *   classified this way, as if another client resolved the conflict.
 *
 * @internal
 */
export type OpSource =
  | { origin: "remote" }
  | { origin: "local"; via: Via; optimistic: boolean };

/**
 * Where a Storage update came from.
 *
 * Updates with `origin: "remote"` were made by another client, and reached
 * this client over the network. Updates with `origin: "local"` were made by
 * this client, and `via` says how: a regular edit, or a replay from the
 * undo/redo history.
 */
// prettier-ignore
export type UpdateSource = 
  | { origin: "remote" }
  | { origin: "local"; via: Via };

export const REMOTE = freeze({ origin: "remote" }) satisfies UpdateSource;
export const LOCAL_EDIT = freeze({ origin: "local", via: "edit" }) satisfies UpdateSource; // prettier-ignore
export const LOCAL_UNDO = freeze({ origin: "local", via: "undo" }) satisfies UpdateSource; // prettier-ignore
export const LOCAL_REDO = freeze({ origin: "local", via: "redo" }) satisfies UpdateSource; // prettier-ignore

/** Narrows an {@link OpSource} down to what subscribers may see. */
export function toUpdateSource(source: OpSource | UpdateSource): UpdateSource {
  return source.origin === "remote"
    ? source
    : // Removes `optimistic` field, which is not public
      { origin: "local", via: source.via };
}

/**
 * The payload of notifications sent (in-client) when LiveStructures change.
 * Messages of this kind are not originating from the network, but are 100%
 * in-client.
 *
 * Every update carries a `source`, saying where the change came from. See
 * {@link UpdateSource}.
 */
export type StorageUpdate =
  | LiveMapUpdate
  | LiveObjectUpdate
  | LiveListUpdate
  | LiveTextUpdate;
