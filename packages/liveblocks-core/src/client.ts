import { createAuthManager } from "./auth-manager";
import type { LsonObject } from "./crdts/Lson";
import { linkDevTools, setupDevTools, unlinkDevTools } from "./devtools";
import { nn } from "./lib/assert";
import { deprecateIf } from "./lib/deprecation";
import type { Json, JsonObject } from "./lib/Json";
import type { Resolve } from "./lib/Resolve";
import type { CustomAuthenticationResult } from "./protocol/Authentication";
import type { BaseUserMeta } from "./protocol/BaseUserMeta";
import type { Polyfills, Room, RoomDelegates, RoomInitializers } from "./room";
import {
  createRoom,
  makeAuthDelegateForRoom,
  makeCreateSocketDelegateForRoom,
} from "./room";

const MIN_THROTTLE = 16;
const MAX_THROTTLE = 1000;
const DEFAULT_THROTTLE = 100;

const MIN_LOST_CONNECTION_TIMEOUT = 200;
const RECOMMENDED_MIN_LOST_CONNECTION_TIMEOUT = 1000;
const MAX_LOST_CONNECTION_TIMEOUT = 30000;
const DEFAULT_LOST_CONNECTION_TIMEOUT = 5000;

let lastTicketId = 0;

type EnterOptions<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
> = Resolve<
  // Enter options are just room initializers, plus an internal option
  RoomInitializers<TPresence, TStorage> & {
    /**
     * Only necessary when you’re using Liveblocks with React v17 or lower.
     *
     * If so, pass in a reference to `ReactDOM.unstable_batchedUpdates` here.
     * This will allow Liveblocks to circumvent the so-called "zombie child
     * problem". To learn more, see
     * https://liveblocks.io/docs/guides/troubleshooting#stale-props-zombie-child
     */
    unstable_batchedUpdates?: (cb: () => void) => void;
  }
>;

export type Client = {
  /**
   * Gets a room. Returns null if {@link Client.enter} has not been called previously.
   *
   * @param roomId The id of the room
   */
  getRoom<
    TPresence extends JsonObject,
    TStorage extends LsonObject = LsonObject,
    TUserMeta extends BaseUserMeta = BaseUserMeta,
    TRoomEvent extends Json = never,
  >(
    roomId: string
  ): Room<TPresence, TStorage, TUserMeta, TRoomEvent> | null;

  /**
   * Enter a room.
   * @param roomId The id of the room
   * @param options Optional. You can provide initializers for the Presence or Storage when entering the Room.
   * @returns The room and a leave function. Call the returned leave() function when you no longer need the room.
   */
  enterRoom<
    TPresence extends JsonObject,
    TStorage extends LsonObject = LsonObject,
    TUserMeta extends BaseUserMeta = BaseUserMeta,
    TRoomEvent extends Json = never,
  >(
    roomId: string,
    options: EnterOptions<TPresence, TStorage>
  ): {
    room: Room<TPresence, TStorage, TUserMeta, TRoomEvent>;
    leave: () => void;
    ticket: Ticket;
  };

  /**
   * @deprecated - Prefer using {@link Client.enterRoom} instead.
   *
   * Enters a room and returns it.
   * @param roomId The id of the room
   * @param options Optional. You can provide initializers for the Presence or Storage when entering the Room.
   */
  enter<
    TPresence extends JsonObject,
    TStorage extends LsonObject = LsonObject,
    TUserMeta extends BaseUserMeta = BaseUserMeta,
    TRoomEvent extends Json = never,
  >(
    roomId: string,
    options: EnterOptions<TPresence, TStorage>
  ): Room<TPresence, TStorage, TUserMeta, TRoomEvent>;

  /**
   * @deprecated - Prefer using {@link Client.enterRoom} and calling the returned leave function instead, which is safer.
   *
   * Forcefully leaves a room.
   *
   * Only call this if you know for sure there are no other "instances" of this
   * room used elsewhere in your application. Force-leaving can trigger
   * unexpected conditions in other parts of your application that may not
   * expect this.
   *
   * @param roomId The id of the room
   */
  leave(roomId: string): void;
};

export type AuthEndpoint =
  | string
  | ((room: string) => Promise<CustomAuthenticationResult>);

/**
 * The authentication endpoint that is called to ensure that the current user has access to a room.
 * Can be an url or a callback if you need to add additional headers.
 */
export type ClientOptions = {
  throttle?: number; // in milliseconds
  lostConnectionTimeout?: number; // in milliseconds
  polyfills?: Polyfills;
  unstable_fallbackToHTTP?: boolean;

  /**
   * @deprecated Use `polyfills: { fetch: ... }` instead.
   * This option will be removed in a future release.
   */
  fetchPolyfill?: Polyfills["fetch"];

  /**
   * @deprecated Use `polyfills: { WebSocket: ... }` instead.
   * This option will be removed in a future release.
   */
  WebSocketPolyfill?: Polyfills["WebSocket"];

  /** @internal */
  mockedDelegates?: RoomDelegates;
  /** @internal */
  enableDebugLogging?: boolean;
} & (
  | { publicApiKey: string; authEndpoint?: never }
  | { publicApiKey?: never; authEndpoint: AuthEndpoint }
);
// ^^^^^^^^^^^^^^^
// NOTE: Potential upgrade path by introducing a new property:
//
//   | { publicApiKey: string; authEndpoint?: never; authUrl?: never }
//   | { publicApiKey?: never; authEndpoint: AuthEndpoint; authUrl?: never }
//   | { publicApiKey?: never; authEndpoint?: never; authUrl?: AuthUrl }
//
// Where:
//
//   export type AuthUrl =
//     | string
//     | ((room: string) => Promise<{ token: string }>);
//

function getServerFromClientOptions(clientOptions: ClientOptions) {
  const rawOptions = clientOptions as Record<string, unknown>;
  return typeof rawOptions.liveblocksServer === "string"
    ? rawOptions.liveblocksServer
    : "wss://api.liveblocks.io/v7";
}

declare const brand: unique symbol;
type Brand<T, TBrand extends string> = T & { [brand]: TBrand };
type Ticket = Brand<symbol, "Ticket">;

/**
 * Create a client that will be responsible to communicate with liveblocks servers.
 *
 * @example
 * const client = createClient({
 *   authEndpoint: "/api/auth"
 * });
 *
 * // It's also possible to use a function to call your authentication endpoint.
 * // Useful to add additional headers or use an API wrapper (like Firebase functions)
 * const client = createClient({
 *   authEndpoint: async (room) => {
 *     const response = await fetch("/api/auth", {
 *       method: "POST",
 *       headers: {
 *          Authentication: "token",
 *          "Content-Type": "application/json"
 *       },
 *       body: JSON.stringify({ room })
 *     });
 *
 *     return await response.json(); // should be: { token: "..." }
 *   }
 * });
 */
export function createClient(options: ClientOptions): Client {
  type RRRoom = Room<JsonObject, LsonObject, BaseUserMeta, Json>;

  const clientOptions = options;
  const throttleDelay = getThrottle(clientOptions.throttle ?? DEFAULT_THROTTLE);
  const lostConnectionTimeout = getLostConnectionTimeout(
    clientOptions.lostConnectionTimeout ?? DEFAULT_LOST_CONNECTION_TIMEOUT
  );

  const authManager = createAuthManager(options);

  const roomsById = new Map<string, RRRoom>();
  const roomIdsByTicket = new Map<Ticket, string>();

  function createTicketForRoom<
    TPresence extends JsonObject,
    TStorage extends LsonObject = LsonObject,
    TUserMeta extends BaseUserMeta = BaseUserMeta,
    TRoomEvent extends Json = never,
  >(roomId: string, options: EnterOptions<TPresence, TStorage>): Ticket {
    const ticket = Symbol(`ticket ${++lastTicketId} for ${roomId}`) as Ticket;

    const existingRoom = roomsById.get(roomId);
    if (existingRoom !== undefined) {
      roomIdsByTicket.set(ticket, roomId);
      return ticket;
    }

    deprecateIf(
      options.initialPresence === null || options.initialPresence === undefined,
      "Please provide an initial presence value for the current user when entering the room."
    );

    const newRoom = createRoom<TPresence, TStorage, TUserMeta, TRoomEvent>(
      {
        initialPresence: options.initialPresence ?? {},
        initialStorage: options.initialStorage,
      },
      {
        roomId,
        throttleDelay,
        lostConnectionTimeout,
        polyfills: clientOptions.polyfills,
        delegates: clientOptions.mockedDelegates ?? {
          createSocket: makeCreateSocketDelegateForRoom(
            roomId,
            getServerFromClientOptions(clientOptions),
            clientOptions.polyfills?.WebSocket
          ),
          authenticate: makeAuthDelegateForRoom(roomId, authManager),
        },
        enableDebugLogging: clientOptions.enableDebugLogging,
        unstable_batchedUpdates: options?.unstable_batchedUpdates,
        liveblocksServer: getServerFromClientOptions(clientOptions),
        unstable_fallbackToHTTP: !!clientOptions.unstable_fallbackToHTTP,
      }
    );

    roomsById.set(roomId, newRoom);

    setupDevTools(() => Array.from(roomsById.keys()));
    linkDevTools(roomId, newRoom);

    const shouldConnect = options.shouldInitiallyConnect ?? true;
    if (shouldConnect) {
      // we need to check here because nextjs would fail earlier with Node < 16
      if (typeof atob === "undefined") {
        if (clientOptions.polyfills?.atob === undefined) {
          throw new Error(
            "You need to polyfill atob to use the client in your environment. Please follow the instructions at https://liveblocks.io/docs/errors/liveblocks-client/atob-polyfill"
          );
        }
        // At this point, atob does not exist so we are either on React Native or on Node < 16, hence global is available.
        global.atob = clientOptions.polyfills.atob;
      }

      newRoom.connect();
    }

    roomIdsByTicket.set(ticket, roomId);
    return ticket;
  }

  function enterRoom<
    TPresence extends JsonObject,
    TStorage extends LsonObject = LsonObject,
    TUserMeta extends BaseUserMeta = BaseUserMeta,
    TRoomEvent extends Json = never,
  >(
    roomId: string,
    options: EnterOptions<TPresence, TStorage>
  ): {
    room: Room<TPresence, TStorage, TUserMeta, TRoomEvent>;
    leave: () => void;
    ticket: Ticket; // XXX Remove -- added to debug!
  } {
    const ticket = createTicketForRoom(roomId, options);
    const room = nn(
      roomsById.get(roomId),
      "Did not find a Room for this room ID. Was the room already destroyed?"
    ) as Room<TPresence, TStorage, TUserMeta, TRoomEvent>;
    const leave = () => leaveWithTicket(ticket);
    return { room, leave, ticket };
  }

  function leaveWithTicket(ticket: Ticket) {
    const roomId = roomIdsByTicket.get(ticket);
    if (roomId === undefined) {
      // Room was already left, maybe by a forceLeave() call that preceded this?
      // XXX Don't throw in production
      throw new Error("Unknown ticket");
    }

    roomIdsByTicket.delete(ticket);

    // Is this the last room instance to be left?
    if (!Array.from(roomIdsByTicket.values()).includes(roomId)) {
      const room = nn(roomsById.get(roomId), "Internal inconsistnecy");

      unlinkDevTools(roomId);
      roomsById.delete(roomId);
      room?.destroy();
    }
  }

  function enter<
    TPresence extends JsonObject,
    TStorage extends LsonObject = LsonObject,
    TUserMeta extends BaseUserMeta = BaseUserMeta,
    TRoomEvent extends Json = never,
  >(
    roomId: string,
    options: EnterOptions<TPresence, TStorage>
  ): Room<TPresence, TStorage, TUserMeta, TRoomEvent> {
    const { room, leave: _ } = enterRoom<
      TPresence,
      TStorage,
      TUserMeta,
      TRoomEvent
    >(roomId, options);
    return room;
  }

  function getRoom<
    TPresence extends JsonObject,
    TStorage extends LsonObject = LsonObject,
    TUserMeta extends BaseUserMeta = BaseUserMeta,
    TRoomEvent extends Json = never,
  >(roomId: string): Room<TPresence, TStorage, TUserMeta, TRoomEvent> | null {
    const room = roomsById.get(roomId);
    return room
      ? (room as Room<TPresence, TStorage, TUserMeta, TRoomEvent>)
      : null;
  }

  function teardownRoom(roomId: string) {
    for (const [ticket, rId] of roomIdsByTicket) {
      if (roomId === rId) {
        leaveWithTicket(ticket);
      }
    }
  }

  return {
    // Old, deprecated APIs
    enter,
    getRoom,
    leave: teardownRoom,

    // New, preferred API
    enterRoom,
  };
}

function checkBounds(
  option: string,
  value: unknown,
  min: number,
  max: number,
  recommendedMin?: number
): number {
  if (typeof value !== "number" || value < min || value > max) {
    throw new Error(
      `${option} should be a number between ${
        recommendedMin ?? min
      } and ${max}.`
    );
  }
  return value;
}

function getThrottle(value: number): number {
  return checkBounds("throttle", value, MIN_THROTTLE, MAX_THROTTLE);
}

function getLostConnectionTimeout(value: number): number {
  return checkBounds(
    "lostConnectionTimeout",
    value,
    MIN_LOST_CONNECTION_TIMEOUT,
    MAX_LOST_CONNECTION_TIMEOUT,
    RECOMMENDED_MIN_LOST_CONNECTION_TIMEOUT
  );
}
