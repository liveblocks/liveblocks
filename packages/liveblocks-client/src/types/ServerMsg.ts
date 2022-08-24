import type { BaseUserMeta } from "./BaseUserMeta";
import type { Json, JsonObject } from "./Json";
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
  | FullUpdatePresenceServerMsg<TPresence>
  | PartialUpdatePresenceServerMsg<TPresence>;

export type FullUpdatePresenceServerMsg<TPresence extends JsonObject> = {
  type: ServerMsgCode.UPDATE_PRESENCE;
  /**
   * The User whose Presence has changed.
   */
  actor: number;
  /**
   * If this message was sent in response to a newly joined user, this field
   * indicates which client this message is for. Other existing clients may
   * ignore this message if this message isn't targeted for them, but they
   * don't have to.
   */
  targetActor: number;
  /**
   * The partial or full Presence of a User. If the `targetActor` field is set,
   * this will be the full Presence, otherwise it only contain the fields that
   * have changed since the last broadcast.
   */
  data: TPresence;
};

export type PartialUpdatePresenceServerMsg<TPresence extends JsonObject> = {
  type: ServerMsgCode.UPDATE_PRESENCE;
  /**
   * The User whose Presence has changed.
   */
  actor: number;
  /**
   * Not set for partial presence updates.
   */
  targetActor?: undefined;
  /**
   * A partial Presence patch to apply to the User. It will only contain the
   * fields that have changed since the last broadcast.
   */
  data: Partial<TPresence>;
};

/**
 * Sent by the WebSocket server and broadcasted to all clients to announce that
 * a new User has joined the Room.
 */
export type UserJoinServerMsg<TUserMeta extends BaseUserMeta> = {
  type: ServerMsgCode.USER_JOINED;
  actor: number;
  /**
   * The id of the User that has been set in the authentication endpoint.
   * Useful to get additional information about the connected user.
   */
  id: TUserMeta["id"];
  /**
   * Additional user information that has been set in the authentication
   * endpoint.
   */
  info: TUserMeta["info"];
};

/**
 * Sent by the WebSocket server and broadcasted to all clients to announce that
 * a new User has left the Room.
 */
export type UserLeftServerMsg = {
  type: ServerMsgCode.USER_LEFT;
  actor: number;
};

/**
 * Sent by the WebSocket server and broadcasted to all clients to announce that
 * a User broadcasted an Event to everyone in the Room.
 */
export type BroadcastedEventServerMsg<TRoomEvent extends Json> = {
  type: ServerMsgCode.BROADCASTED_EVENT;
  /**
   * The User who broadcasted the Event.
   */
  actor: number;
  /**
   * The arbitrary payload of the Event. This can be any JSON value. Clients
   * will have to manually verify/decode this event.
   */
  event: TRoomEvent;
};

/**
 * Sent by the WebSocket server to a single client in response to the client
 * joining the Room, to provide the initial state of the Room. The payload
 * includes a list of all other Users that already are in the Room.
 */
export type RoomStateServerMsg<TUserMeta extends BaseUserMeta> = {
  type: ServerMsgCode.ROOM_STATE;
  users: {
    [actor: number]: TUserMeta;
  };
};

/**
 * Sent by the WebSocket server to a single client in response to the client
 * joining the Room, to provide the initial Storage state of the Room. The
 * payload includes the entire Storage document.
 */
export type InitialDocumentStateServerMsg = {
  type: ServerMsgCode.INITIAL_STORAGE_STATE;
  items: IdTuple<SerializedCrdt>[];
};

/**
 * Sent by the WebSocket server and broadcasted to all clients to announce that
 * a change occurred in the Storage document.
 *
 * The payload of this message contains a list of Ops (aka incremental
 * mutations to make to the initially loaded document).
 */
export type UpdateStorageServerMsg = {
  type: ServerMsgCode.UPDATE_STORAGE;
  ops: Op[];
};
