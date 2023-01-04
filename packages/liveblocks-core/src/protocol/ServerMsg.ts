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
}

/**
 * Messages that can be sent from the server to the client.
 */
export type ServerMsg<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
> =
  // For Presence
  | UpdatePresenceServerMsg<TPresence> // Broadcasted
  | UserJoinServerMsg<TUserMeta> // Broadcasted
  | UserLeftServerMsg // Broadcasted
  | BroadcastedEventServerMsg<TRoomEvent> // Broadcasted
  | RoomStateServerMsg<TUserMeta> // For a single client

  // For Storage
  | InitialDocumentStateServerMsg // For a single client
  | UpdateStorageServerMsg; // Broadcasted

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
export type UpdatePresenceServerMsg<TPresence extends JsonObject> =
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
      readonly data: TPresence;
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
      readonly data: Partial<TPresence>;
    };

/**
 * Sent by the WebSocket server and broadcasted to all clients to announce that
 * a new User has joined the Room.
 */
export type UserJoinServerMsg<TUserMeta extends BaseUserMeta> = {
  readonly type: ServerMsgCode.USER_JOINED;
  readonly actor: number;
  /**
   * The id of the User that has been set in the authentication endpoint.
   * Useful to get additional information about the connected user.
   */
  readonly id: TUserMeta["id"];
  /**
   * Additional user information that has been set in the authentication
   * endpoint.
   */
  readonly info: TUserMeta["info"];

  /**
   * Permissions that the user has in the Room.
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
 * Sent by the WebSocket server and broadcasted to all clients to announce that
 * a User broadcasted an Event to everyone in the Room.
 */
export type BroadcastedEventServerMsg<TRoomEvent extends Json> = {
  readonly type: ServerMsgCode.BROADCASTED_EVENT;
  /**
   * The User who broadcasted the Event.
   */
  readonly actor: number;
  /**
   * The arbitrary payload of the Event. This can be any JSON value. Clients
   * will have to manually verify/decode this event.
   */
  readonly event: TRoomEvent;
};

/**
 * Sent by the WebSocket server to a single client in response to the client
 * joining the Room, to provide the initial state of the Room. The payload
 * includes a list of all other Users that already are in the Room.
 */
export type RoomStateServerMsg<TUserMeta extends BaseUserMeta> = {
  readonly type: ServerMsgCode.ROOM_STATE;
  readonly users: {
    readonly [actor: number]: TUserMeta & { scopes: string[] };
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
