import type { Json, JsonObject } from "../lib/Json";
import type { BaseUserMeta } from "./BaseUserMeta";
import type { Feed, FeedMessage } from "./Feeds";
import type { ServerWireOp } from "./Op";
import type { CompactNode, StorageNode } from "./StorageNode";

export type ServerMsgCode = (typeof ServerMsgCode)[keyof typeof ServerMsgCode];
export const ServerMsgCode = Object.freeze({
  // For Presence
  UPDATE_PRESENCE: 100,
  USER_JOINED: 101,
  USER_LEFT: 102,
  BROADCASTED_EVENT: 103,
  ROOM_STATE: 104,

  // For Storage
  STORAGE_STATE_V7: 200, // Only sent in V7
  STORAGE_CHUNK: 210, // Used in V8+
  STORAGE_STREAM_END: 211, // Used in V8+
  UPDATE_STORAGE: 201,

  // For Yjs Docs
  UPDATE_YDOC: 300,

  // For Comments
  THREAD_CREATED: 400,
  THREAD_DELETED: 407,
  THREAD_METADATA_UPDATED: 401,
  THREAD_UPDATED: 408,
  COMMENT_CREATED: 402,
  COMMENT_EDITED: 403,
  COMMENT_DELETED: 404,
  COMMENT_REACTION_ADDED: 405,
  COMMENT_REACTION_REMOVED: 406,
  COMMENT_METADATA_UPDATED: 409,

  // For Feeds
  FEEDS_LIST: 500,
  FEEDS_ADDED: 501,
  FEEDS_UPDATED: 502,
  FEED_DELETED: 503,
  FEED_MESSAGES_LIST: 504,
  FEED_MESSAGES_ADDED: 505,
  FEED_MESSAGES_UPDATED: 506,
  FEED_MESSAGES_DELETED: 507,
  FEED_REQUEST_FAILED: 508,

  // Error codes
  REJECT_STORAGE_OP: 299, // Sent if a mutation was not allowed on the server (i.e. due to permissions, limit exceeded, etc)
});

export namespace ServerMsgCode {
  export type UPDATE_PRESENCE = typeof ServerMsgCode.UPDATE_PRESENCE;
  export type USER_JOINED = typeof ServerMsgCode.USER_JOINED;
  export type USER_LEFT = typeof ServerMsgCode.USER_LEFT;
  export type BROADCASTED_EVENT = typeof ServerMsgCode.BROADCASTED_EVENT;
  export type ROOM_STATE = typeof ServerMsgCode.ROOM_STATE;
  export type STORAGE_STATE_V7 = typeof ServerMsgCode.STORAGE_STATE_V7;
  export type STORAGE_CHUNK = typeof ServerMsgCode.STORAGE_CHUNK;
  export type STORAGE_STREAM_END = typeof ServerMsgCode.STORAGE_STREAM_END;
  export type UPDATE_STORAGE = typeof ServerMsgCode.UPDATE_STORAGE;
  export type UPDATE_YDOC = typeof ServerMsgCode.UPDATE_YDOC;
  export type THREAD_CREATED = typeof ServerMsgCode.THREAD_CREATED;
  export type THREAD_DELETED = typeof ServerMsgCode.THREAD_DELETED;
  export type THREAD_METADATA_UPDATED =
    typeof ServerMsgCode.THREAD_METADATA_UPDATED;
  export type THREAD_UPDATED = typeof ServerMsgCode.THREAD_UPDATED;
  export type COMMENT_CREATED = typeof ServerMsgCode.COMMENT_CREATED;
  export type COMMENT_EDITED = typeof ServerMsgCode.COMMENT_EDITED;
  export type COMMENT_DELETED = typeof ServerMsgCode.COMMENT_DELETED;
  export type COMMENT_REACTION_ADDED =
    typeof ServerMsgCode.COMMENT_REACTION_ADDED;
  export type COMMENT_REACTION_REMOVED =
    typeof ServerMsgCode.COMMENT_REACTION_REMOVED;
  export type FEEDS_LIST = typeof ServerMsgCode.FEEDS_LIST;
  export type FEEDS_ADDED = typeof ServerMsgCode.FEEDS_ADDED;
  export type FEEDS_UPDATED = typeof ServerMsgCode.FEEDS_UPDATED;
  export type FEED_DELETED = typeof ServerMsgCode.FEED_DELETED;
  export type FEED_MESSAGES_LIST = typeof ServerMsgCode.FEED_MESSAGES_LIST;
  export type FEED_MESSAGES_ADDED = typeof ServerMsgCode.FEED_MESSAGES_ADDED;
  export type FEED_MESSAGES_UPDATED =
    typeof ServerMsgCode.FEED_MESSAGES_UPDATED;
  export type FEED_MESSAGES_DELETED =
    typeof ServerMsgCode.FEED_MESSAGES_DELETED;
  export type FEED_REQUEST_FAILED = typeof ServerMsgCode.FEED_REQUEST_FAILED;
  export type COMMENT_METADATA_UPDATED =
    typeof ServerMsgCode.COMMENT_METADATA_UPDATED;
  export type REJECT_STORAGE_OP = typeof ServerMsgCode.REJECT_STORAGE_OP;
}

/**
 * Messages that can be sent from the server to the client.
 */
export type ServerMsg<
  P extends JsonObject,
  U extends BaseUserMeta,
  E extends Json,
> =
  // For Presence
  | UpdatePresenceServerMsg<P> // Broadcasted
  | UserJoinServerMsg<U> // Broadcasted
  | UserLeftServerMsg // Broadcasted
  | BroadcastedEventServerMsg<E> // Broadcasted
  | RoomStateServerMsg<U> // For a single client

  // For Storage
  | StorageStateServerMsg_V7 // Only used in protocol v7
  | StorageChunkServerMsg // Used in protocol v8+
  | StorageEndServerMsg // Used in protocol v8+
  | UpdateStorageServerMsg // Broadcasted
  | YDocUpdateServerMsg // For receiving doc from backend
  | RejectedStorageOpServerMsg // For a single client

  // Comments
  | CommentsEventServerMsg

  // Feeds
  | FeedsEventServerMsg;

export type CommentsEventServerMsg =
  | ThreadCreatedEvent
  | ThreadDeletedEvent
  | ThreadMetadataUpdatedEvent
  | ThreadUpdatedEvent
  | CommentCreatedEvent
  | CommentEditedEvent
  | CommentDeletedEvent
  | CommentReactionAdded
  | CommentReactionRemoved
  | CommentMetadataUpdatedEvent;

type ThreadCreatedEvent = {
  type: ServerMsgCode.THREAD_CREATED;
  threadId: string;
};

type ThreadDeletedEvent = {
  type: ServerMsgCode.THREAD_DELETED;
  threadId: string;
};

type ThreadMetadataUpdatedEvent = {
  type: ServerMsgCode.THREAD_METADATA_UPDATED;
  threadId: string;
};

type ThreadUpdatedEvent = {
  type: ServerMsgCode.THREAD_UPDATED;
  threadId: string;
};

type CommentCreatedEvent = {
  type: ServerMsgCode.COMMENT_CREATED;
  threadId: string;
  commentId: string;
};

type CommentEditedEvent = {
  type: ServerMsgCode.COMMENT_EDITED;
  threadId: string;
  commentId: string;
};

type CommentDeletedEvent = {
  type: ServerMsgCode.COMMENT_DELETED;
  threadId: string;
  commentId: string;
};

type CommentReactionAdded = {
  type: ServerMsgCode.COMMENT_REACTION_ADDED;
  threadId: string;
  commentId: string;
  emoji: string;
};

type CommentReactionRemoved = {
  type: ServerMsgCode.COMMENT_REACTION_REMOVED;
  threadId: string;
  commentId: string;
  emoji: string;
};

type CommentMetadataUpdatedEvent = {
  type: ServerMsgCode.COMMENT_METADATA_UPDATED;
  threadId: string;
  commentId: string;
};

/**
 * Sent by the WebSocket server and broadcasted to all clients to announce that
 * a User updated their presence. For example, when a user moves their cursor.
 *
 * In most cases, the data payload will only include the fields from the
 * Presence that have been changed since the last announcement. However, after
 * a new user joins a room, a "full presence" will be announced so the newly
 * connected user will get each other's user full presence at least once. In
 * those cases, the `targetActor` field indicates the newly connected client,
 * so all other existing clients can ignore this broadcasted message.
 */
export type UpdatePresenceServerMsg<P extends JsonObject> =
  //
  // Full Presence™ message
  //
  | {
      readonly type: ServerMsgCode.UPDATE_PRESENCE;
      /**
       * The User whose Presence has changed.
       */
      readonly actor: number;
      /**
       * When set, signifies that this is a Full Presence™ update, not a patch.
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
      /**
       * The partial or full Presence of a User. If the `targetActor` field is set,
       * this will be the full Presence, otherwise it only contain the fields that
       * have changed since the last broadcast.
       */
      readonly data: P;
    }

  //
  // Partial Presence™ message
  //
  | {
      readonly type: ServerMsgCode.UPDATE_PRESENCE;
      /**
       * The User whose Presence has changed.
       */
      readonly actor: number;
      /**
       * Not set for partial presence updates.
       */
      readonly targetActor?: undefined;
      /**
       * A partial Presence patch to apply to the User. It will only contain the
       * fields that have changed since the last broadcast.
       */
      readonly data: Partial<P>;
    };

/**
 * Sent by the WebSocket server and broadcasted to all clients to announce that
 * a new User has joined the Room.
 */
export type UserJoinServerMsg<U extends BaseUserMeta> = {
  readonly type: ServerMsgCode.USER_JOINED;
  readonly actor: number;
  /**
   * The id of the User that has been set in the authentication endpoint.
   * Useful to get additional information about the connected user.
   */
  readonly id: U["id"];
  /**
   * Additional user information that has been set in the authentication
   * endpoint.
   */
  readonly info: U["info"];
  /**
   * Informs the client what (public) permissions this (other) User has.
   */
  readonly scopes: string[];
};

/**
 * Sent by the WebSocket server and broadcasted to all clients to announce that
 * a new User has left the Room.
 */
export type UserLeftServerMsg = {
  readonly type: ServerMsgCode.USER_LEFT;
  readonly actor: number;
};

/**
 * Sent by the WebSocket server when the ydoc is updated or when requested based on stateVector passed.
 * Contains a base64 encoded update
 */
export type YDocUpdateServerMsg = {
  readonly type: ServerMsgCode.UPDATE_YDOC;
  readonly update: string;
  readonly isSync: boolean; // dropped after 1.2, we use presence of stateVector instead
  readonly stateVector: string | null; // server's state vector, sent in response to fetch
  readonly guid?: string; // an optional guid to identify which subdoc this update to
  readonly v2?: boolean; // whether this is a v2 update
  readonly remoteSnapshotHash: string; // The hash of snapshot of server's document. Used to detect if the client has the latest version of the document.
};

/**
 * Sent by the WebSocket server and broadcasted to all clients to announce that
 * a User broadcasted an Event to everyone in the Room.
 */
export type BroadcastedEventServerMsg<E extends Json> = {
  readonly type: ServerMsgCode.BROADCASTED_EVENT;
  /**
   * The User who broadcast the Event. Absent when this event is broadcast from
   * the REST API in the backend.
   */
  readonly actor: number;
  /**
   * The arbitrary payload of the Event. This can be any JSON value. Clients
   * will have to manually verify/decode this event.
   */
  readonly event: E;
};

/**
 * Sent by the WebSocket server to a single client in response to the client
 * joining the Room, to provide the initial state of the Room. The payload
 * includes a list of all other Users that already are in the Room.
 */
export type RoomStateServerMsg<U extends BaseUserMeta> = {
  readonly type: ServerMsgCode.ROOM_STATE;
  /** Informs the client what their actor ID is going to be. */
  readonly actor: number;
  /** Secure nonce for the current session. */
  readonly nonce: string;
  /** Informs the client what permissions the current User (self) has. */
  readonly scopes: string[];
  readonly users: {
    readonly [otherActor: number]: U & { scopes: string[] };
  };
  /** Metadata sent from the server to the client. */
  readonly meta: JsonObject;
};

/**
 * No longer used as of WS API v8.
 */
export type StorageStateServerMsg_V7 = {
  readonly type: ServerMsgCode.STORAGE_STATE_V7;
  readonly items: StorageNode[];
};

/**
 * Sent by the WebSocket server to a single client in response to the client
 * sending a FetchStorageClientMsg message, to provide one chunk of the initial
 * Storage state of the Room.
 *
 * The server will respond with 1+ STORAGE_CHUNK messages, followed by exactly
 * one STORAGE_STREAM_END message to mark the end of the transmission.
 *
 * If the room is using the new storage engine that supports streaming, then
 * potentially multiple chunks might get sent. If the room is using the old
 * storage engine, then all nodes will be sent in a single/large chunk
 * (non-streaming).
 */
export type StorageChunkServerMsg = {
  readonly type: ServerMsgCode.STORAGE_CHUNK;
  readonly nodes: CompactNode[];
};

export type StorageEndServerMsg = {
  readonly type: ServerMsgCode.STORAGE_STREAM_END;
};

/**
 * Sent by the WebSocket server and broadcasted to all clients to announce that
 * a change occurred in the Storage document.
 *
 * The payload of this message contains a list of Ops (aka incremental
 * mutations to make to the initially loaded document).
 */
export type UpdateStorageServerMsg = {
  readonly type: ServerMsgCode.UPDATE_STORAGE;
  readonly ops: ServerWireOp[];
};

/**
 * Sent by the WebSocket server to the client to indicate that certain opIds
 * have been rejected, possibly due to lack of permissions or exceeding
 * a limit.
 */
export type RejectedStorageOpServerMsg = {
  readonly type: ServerMsgCode.REJECT_STORAGE_OP;
  readonly opIds: string[];
  readonly reason: string;
};

export type FeedsEventServerMsg<
  FM extends Json = Json,
  FMD extends Json = Json,
> =
  | FeedsListServerMsg<FM>
  | FeedsAddedServerMsg<FM>
  | FeedsUpdatedServerMsg<FM>
  | FeedDeletedServerMsg
  | FeedMessagesListServerMsg<FMD>
  | FeedMessagesAddedServerMsg<FMD>
  | FeedMessagesUpdatedServerMsg<FMD>
  | FeedMessagesDeletedServerMsg
  | FeedRequestFailedServerMsg;

/** Error codes for {@link FeedRequestFailedServerMsg}. */
export const FeedRequestErrorCode = {
  INTERNAL: "INTERNAL",
  FEED_ALREADY_EXISTS: "FEED_ALREADY_EXISTS",
  FEED_NOT_FOUND: "FEED_NOT_FOUND",
  FEED_MESSAGE_NOT_FOUND: "FEED_MESSAGE_NOT_FOUND",
} as const;

/** String literals accepted in {@link FeedRequestFailedServerMsg}.code */
export type FeedRequestError =
  (typeof FeedRequestErrorCode)[keyof typeof FeedRequestErrorCode];

/**
 * Sent to the client when a feed mutation referenced by `requestId` failed
 * (e.g. validation or permission error).
 */
export type FeedRequestFailedServerMsg = {
  readonly type: ServerMsgCode.FEED_REQUEST_FAILED;
  readonly requestId: string;
  readonly code: string;
  readonly reason?: string;
};

export type FeedsListServerMsg<FM extends Json = Json> = {
  readonly type: ServerMsgCode.FEEDS_LIST;
  readonly requestId: string;
  readonly feeds: Feed<FM>[];
  readonly nextCursor?: string;
};

export type FeedsAddedServerMsg<FM extends Json = Json> = {
  readonly type: ServerMsgCode.FEEDS_ADDED;
  readonly feeds: Feed<FM>[];
};

export type FeedsUpdatedServerMsg<FM extends Json = Json> = {
  readonly type: ServerMsgCode.FEEDS_UPDATED;
  readonly feeds: Feed<FM>[];
};

export type FeedDeletedServerMsg = {
  readonly type: ServerMsgCode.FEED_DELETED;
  readonly feedId: string;
};

export type FeedMessagesListServerMsg<FMD extends Json = Json> = {
  readonly type: ServerMsgCode.FEED_MESSAGES_LIST;
  readonly requestId: string;
  readonly feedId: string;
  readonly messages: FeedMessage<FMD>[];
  readonly nextCursor?: string;
};

export type FeedMessagesAddedServerMsg<FMD extends Json = Json> = {
  readonly type: ServerMsgCode.FEED_MESSAGES_ADDED;
  readonly feedId: string;
  readonly messages: FeedMessage<FMD>[];
};

export type FeedMessagesUpdatedServerMsg<FMD extends Json = Json> = {
  readonly type: ServerMsgCode.FEED_MESSAGES_UPDATED;
  readonly feedId: string;
  readonly messages: FeedMessage<FMD>[];
};

export type FeedMessagesDeletedServerMsg = {
  readonly type: ServerMsgCode.FEED_MESSAGES_DELETED;
  readonly feedId: string;
  readonly messageIds: readonly string[];
};
