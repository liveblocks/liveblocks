import type { Json, JsonObject } from "../lib/Json";
import type { Op } from "./Op";

export enum ClientMsgCode {
  // For Presence
  UPDATE_PRESENCE = 100,
  BROADCAST_EVENT = 103,

  // For Storage
  FETCH_STORAGE = 200,
  UPDATE_STORAGE = 201,

  // For Yjs support
  FETCH_YDOC = 300,
  UPDATE_YDOC = 301,
}

/**
 * Messages that can be sent from the client to the server.
 */
export type ClientMsg<P extends JsonObject, E extends Json> =
  // For Presence
  | BroadcastEventClientMsg<E>
  | UpdatePresenceClientMsg<P>

  // For Storage
  | UpdateStorageClientMsg
  | FetchStorageClientMsg

  // For Yjs support
  | FetchYDocClientMsg
  | UpdateYDocClientMsg;

export type BroadcastEventClientMsg<E extends Json> = {
  type: ClientMsgCode.BROADCAST_EVENT;
  event: E;
};

export type UpdatePresenceClientMsg<P extends JsonObject> =
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
      readonly data: P;
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
      readonly data: Partial<P>;
    };

export type UpdateStorageClientMsg = {
  readonly type: ClientMsgCode.UPDATE_STORAGE;
  readonly ops: Op[];
};

export type FetchStorageClientMsg = {
  readonly type: ClientMsgCode.FETCH_STORAGE;
};

export type FetchYDocClientMsg = {
  readonly type: ClientMsgCode.FETCH_YDOC;
  readonly vector: string; // base64 encoded stateVector a from yjs doc
  readonly guid?: string; // an optional guid to identify a subdoc
};

export type UpdateYDocClientMsg = {
  readonly type: ClientMsgCode.UPDATE_YDOC;
  readonly update: string; // base64 encoded update from a yjs doc
  readonly guid?: string; // an optional guid to identify a subdoc
};
