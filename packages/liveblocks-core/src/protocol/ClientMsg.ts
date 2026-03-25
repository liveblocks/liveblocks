import type { Json, JsonObject } from "../lib/Json";
import type { ClientWireOp } from "./Op";

export type ClientMsgCode = (typeof ClientMsgCode)[keyof typeof ClientMsgCode];
export const ClientMsgCode = Object.freeze({
  // For Presence
  UPDATE_PRESENCE: 100,
  BROADCAST_EVENT: 103,

  // For Storage
  FETCH_STORAGE: 200,
  UPDATE_STORAGE: 201,

  // For Yjs support
  FETCH_YDOC: 300,
  UPDATE_YDOC: 301,

  // For Feeds
  FETCH_FEEDS: 510,
  FETCH_FEED_MESSAGES: 511,
  ADD_FEED: 512,
  UPDATE_FEED: 513,
  DELETE_FEED: 514,
  ADD_FEED_MESSAGE: 515,
  UPDATE_FEED_MESSAGE: 516,
  DELETE_FEED_MESSAGE: 517,
});

export namespace ClientMsgCode {
  export type UPDATE_PRESENCE = typeof ClientMsgCode.UPDATE_PRESENCE;
  export type BROADCAST_EVENT = typeof ClientMsgCode.BROADCAST_EVENT;
  export type FETCH_STORAGE = typeof ClientMsgCode.FETCH_STORAGE;
  export type UPDATE_STORAGE = typeof ClientMsgCode.UPDATE_STORAGE;
  export type FETCH_YDOC = typeof ClientMsgCode.FETCH_YDOC;
  export type UPDATE_YDOC = typeof ClientMsgCode.UPDATE_YDOC;
  export type FETCH_FEEDS = typeof ClientMsgCode.FETCH_FEEDS;
  export type FETCH_FEED_MESSAGES = typeof ClientMsgCode.FETCH_FEED_MESSAGES;
  export type ADD_FEED = typeof ClientMsgCode.ADD_FEED;
  export type UPDATE_FEED = typeof ClientMsgCode.UPDATE_FEED;
  export type DELETE_FEED = typeof ClientMsgCode.DELETE_FEED;
  export type ADD_FEED_MESSAGE = typeof ClientMsgCode.ADD_FEED_MESSAGE;
  export type UPDATE_FEED_MESSAGE = typeof ClientMsgCode.UPDATE_FEED_MESSAGE;
  export type DELETE_FEED_MESSAGE = typeof ClientMsgCode.DELETE_FEED_MESSAGE;
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
  | UpdateYDocClientMsg

  // For Feeds
  | FetchFeedsClientMsg
  | FetchFeedMessagesClientMsg
  | AddFeedClientMsg
  | UpdateFeedClientMsg
  | DeleteFeedClientMsg
  | AddFeedMessageClientMsg
  | UpdateFeedMessageClientMsg
  | DeleteFeedMessageClientMsg;

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
  readonly ops: ClientWireOp[];
};

export type FetchStorageClientMsg = {
  readonly type: ClientMsgCode.FETCH_STORAGE;
};

export type FetchYDocClientMsg = {
  readonly type: ClientMsgCode.FETCH_YDOC;
  readonly vector: string; // base64 encoded stateVector a from yjs doc
  readonly guid?: string; // an optional guid to identify a subdoc
  readonly v2?: boolean; // if it's a v2 update
};

export type UpdateYDocClientMsg = {
  readonly type: ClientMsgCode.UPDATE_YDOC;
  readonly update: string; // base64 encoded update from a yjs doc
  readonly guid?: string; // an optional guid to identify a subdoc
  readonly v2?: boolean; // if it's a v2 update
};

/** Metadata filter for {@link FetchFeedsClientMsg}. Values are matched as strings. */
export type FeedFetchMetadataFilter = Record<string, string>;

/** Metadata for {@link AddFeedClientMsg}. */
export type FeedCreateMetadata = Record<string, string | string[]>;

/** Metadata for {@link UpdateFeedClientMsg}. Use `null` to remove a key. */
export type FeedUpdateMetadata = Record<string, string | string[] | null>;

export type FetchFeedsClientMsg = {
  readonly type: ClientMsgCode.FETCH_FEEDS;
  readonly requestId: string;
  readonly cursor?: string;
  readonly since?: number;
  readonly limit?: number;
  readonly metadata?: FeedFetchMetadataFilter;
};

export type FetchFeedMessagesClientMsg = {
  readonly type: ClientMsgCode.FETCH_FEED_MESSAGES;
  readonly requestId: string;
  readonly feedId: string;
  readonly cursor?: string;
  readonly since?: number;
  readonly limit?: number;
};

export type AddFeedClientMsg = {
  readonly type: ClientMsgCode.ADD_FEED;
  readonly feedId: string;
  readonly metadata?: FeedCreateMetadata;
  readonly timestamp?: number;
};

export type UpdateFeedClientMsg = {
  readonly type: ClientMsgCode.UPDATE_FEED;
  readonly feedId: string;
  readonly metadata: FeedUpdateMetadata;
};

export type DeleteFeedClientMsg = {
  readonly type: ClientMsgCode.DELETE_FEED;
  readonly feedId: string;
};

export type AddFeedMessageClientMsg = {
  readonly type: ClientMsgCode.ADD_FEED_MESSAGE;
  readonly feedId: string;
  readonly data: JsonObject;
  readonly id?: string;
  readonly timestamp?: number;
};

export type UpdateFeedMessageClientMsg = {
  readonly type: ClientMsgCode.UPDATE_FEED_MESSAGE;
  readonly feedId: string;
  readonly messageId: string;
  readonly data: JsonObject;
  readonly timestamp?: number;
};

export type DeleteFeedMessageClientMsg = {
  readonly type: ClientMsgCode.DELETE_FEED_MESSAGE;
  readonly feedId: string;
  readonly messageId: string;
};
