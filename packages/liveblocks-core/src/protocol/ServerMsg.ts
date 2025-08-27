import type { Json, JsonObject } from "../lib/Json";
import type { BaseUserMeta } from "./BaseUserMeta";
import type { Op } from "./Op";
import type { IdTuple, SerializedCrdt } from "./SerializedCrdt";

export enum ServerMsgCode {
  // For Presence
  UPDATE_PRESENCE = 100,
  USER_JOINED = 101,
  USER_LEFT = 102,
  BROADCASTED_EVENT = 103,
  ROOM_STATE = 104,

  // For Storage
  INITIAL_STORAGE_STATE = 200,
  UPDATE_STORAGE = 201,
  REJECT_STORAGE_OP = 299,

  // For Yjs Docs
  UPDATE_YDOC = 300,

  // For Comments
  THREAD_CREATED = 400,
  THREAD_DELETED = 407,
  THREAD_METADATA_UPDATED = 401,
  THREAD_UPDATED = 408,
  COMMENT_CREATED = 402,
  COMMENT_EDITED = 403,
  COMMENT_DELETED = 404,
  COMMENT_REACTION_ADDED = 405,
  COMMENT_REACTION_REMOVED = 406,
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
  | InitialDocumentStateServerMsg // For a single client
  | UpdateStorageServerMsg // Broadcasted
  | RejectedStorageOpServerMsg // For a single client
  | YDocUpdateServerMsg // For receiving doc from backend

  // Comments
  | CommentsEventServerMsg;

export type CommentsEventServerMsg =
  | ThreadCreatedEvent
  | ThreadDeletedEvent
  | ThreadMetadataUpdatedEvent
  | ThreadUpdatedEvent
  | CommentCreatedEvent
  | CommentEditedEvent
  | CommentDeletedEvent
  | CommentReactionAdded
  | CommentReactionRemoved;

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

  /**
   * Informs the client what their actor ID is going to be.
   * @since v1.2 (WS API v7)
   */
  readonly actor: number;

  /**
   * Secure nonce for the current session.
   * @since v1.2 (WS API v7)
   */
  readonly nonce: string;

  /**
   * Informs the client what permissions the current User (self) has.
   * @since v1.2 (WS API v7)
   */
  readonly scopes: string[];

  readonly users: {
    readonly [otherActor: number]: U & { scopes: string[] };
  };
};

/**
 * Sent by the WebSocket server to a single client in response to the client
 * joining the Room, to provide the initial Storage state of the Room. The
 * payload includes the entire Storage document.
 */
export type InitialDocumentStateServerMsg = {
  readonly type: ServerMsgCode.INITIAL_STORAGE_STATE;
  readonly items: IdTuple<SerializedCrdt>[];
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
  readonly ops: Op[];
};

/**
 * Sent by the WebSocket server to the client to indicate that certain opIds
 * have been received but were rejected because they caused mutations that are
 * incompatible with the Room's schema.
 */
export type RejectedStorageOpServerMsg = {
  readonly type: ServerMsgCode.REJECT_STORAGE_OP;
  readonly opIds: string[];
  readonly reason: string;
};
