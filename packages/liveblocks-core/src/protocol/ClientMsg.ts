import type { Json, JsonObject } from "../lib/Json";
import type { Op } from "./Op";

export enum ClientMsgCode {
  // For Presence
  UPDATE_PRESENCE = 100,
  BROADCAST_EVENT = 103,

  // For Storage
  FETCH_STORAGE = 200,
  UPDATE_STORAGE = 201,
}

/**
 * Messages that can be sent from the client to the server.
 */
export type ClientMsg<TPresence extends JsonObject, TRoomEvent extends Json> =
  // For Presence
  | BroadcastEventClientMsg<TRoomEvent>
  | UpdatePresenceClientMsg<TPresence>

  // For Storage
  | UpdateStorageClientMsg
  | FetchStorageClientMsg;

export type BroadcastEventClientMsg<TRoomEvent extends Json> = {
  type: ClientMsgCode.BROADCAST_EVENT;
  event: TRoomEvent;
};

export type UpdatePresenceClientMsg<TPresence extends JsonObject> =
  //
  // Full Presence™ message
  //
  | {
      readonly type: ClientMsgCode.UPDATE_PRESENCE;
      /**
       * Set this to any number to signify that this is a Full Presence™
       * update, not a patch.
       *
       * The numeric value itself no longer has specific meaning. Historically,
       * this field was intended so that clients could ignore these broadcasted
       * full presence messages, but it turned out that getting a full presence
       * "keyframe" from time to time was useful.
       *
       * So nowadays, the presence (pun intended) of this `targetActor` field
       * is a backward-compatible way of expressing that the `data` contains
       * all presence fields, and isn't a partial "patch".
       */
      readonly targetActor: number;
      readonly data: TPresence;
    }

  //
  // Partial Presence™ message
  //
  | {
      readonly type: ClientMsgCode.UPDATE_PRESENCE;
      /**
       * Absence of the `targetActor` field signifies that this is a Partial
       * Presence™ "patch".
       */
      readonly targetActor?: undefined;
      readonly data: Partial<TPresence>;
    };

export type UpdateStorageClientMsg = {
  readonly type: ClientMsgCode.UPDATE_STORAGE;
  readonly ops: Op[];
};

export type FetchStorageClientMsg = {
  readonly type: ClientMsgCode.FETCH_STORAGE;
};
