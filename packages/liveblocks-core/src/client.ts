import type { LsonObject } from "./crdts/Lson";
import { linkDevTools, setupDevTools, unlinkDevTools } from "./devtools";
import { deprecateIf } from "./lib/deprecation";
import type { Json, JsonObject } from "./lib/Json";
import type { Resolve } from "./lib/Resolve";
import type { Authentication } from "./protocol/Authentication";
import type { BaseUserMeta } from "./protocol/BaseUserMeta";
import type { Polyfills, Room, RoomDelegates, RoomInitializers } from "./room";
import { createRoom } from "./room";

const MIN_THROTTLE = 16;
const MAX_THROTTLE = 1000;
const DEFAULT_THROTTLE = 100;

const MIN_LOST_CONNECTION_TIMEOUT = 200;
const RECOMMENDED_MIN_LOST_CONNECTION_TIMEOUT = 1000;
const MAX_LOST_CONNECTION_TIMEOUT = 30000;
const DEFAULT_LOST_CONNECTION_TIMEOUT = 5000;

type EnterOptions<
  TPresence extends JsonObject,
  TStorage extends LsonObject
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
    TRoomEvent extends Json = never
  >(
    roomId: string
  ): Room<TPresence, TStorage, TUserMeta, TRoomEvent> | null;

  /**
   * Enters a room and returns it.
   * @param roomId The id of the room
   * @param options Optional. You can provide initializers for the Presence or Storage when entering the Room.
   */
  enter<
    TPresence extends JsonObject,
    TStorage extends LsonObject = LsonObject,
    TUserMeta extends BaseUserMeta = BaseUserMeta,
    TRoomEvent extends Json = never
  >(
    roomId: string,
    options: EnterOptions<TPresence, TStorage>
  ): Room<TPresence, TStorage, TUserMeta, TRoomEvent>;

  /**
   * Leaves a room.
   * @param roomId The id of the room
   */
  leave(roomId: string): void;
};

export type AuthEndpoint =
  | string
  | ((room: string) => Promise<{ token: string }>);

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
  | { publicApiKey?: never; authEndpoint?: AuthEndpoint }
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
//     | ((room?: string) => Promise<{ token: string }>);
//

function getServerFromClientOptions(clientOptions: ClientOptions) {
  const rawOptions = clientOptions as Record<string, unknown>;
  return typeof rawOptions.liveblocksServer === "string"
    ? rawOptions.liveblocksServer
    : "wss://api.liveblocks.io/v6";
}

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
  const clientOptions = options;
  const throttleDelay = getThrottle(clientOptions.throttle ?? DEFAULT_THROTTLE);
  const lostConnectionTimeout = getLostConnectionTimeout(
    clientOptions.lostConnectionTimeout ?? DEFAULT_LOST_CONNECTION_TIMEOUT
  );

  const rooms = new Map<
    string,
    Room<JsonObject, LsonObject, BaseUserMeta, Json>
  >();

  function getRoom<
    TPresence extends JsonObject,
    TStorage extends LsonObject = LsonObject,
    TUserMeta extends BaseUserMeta = BaseUserMeta,
    TRoomEvent extends Json = never
  >(roomId: string): Room<TPresence, TStorage, TUserMeta, TRoomEvent> | null {
    const room = rooms.get(roomId);
    return room
      ? (room as Room<TPresence, TStorage, TUserMeta, TRoomEvent>)
      : null;
  }

  function enter<
    TPresence extends JsonObject,
    TStorage extends LsonObject = LsonObject,
    TUserMeta extends BaseUserMeta = BaseUserMeta,
    TRoomEvent extends Json = never
  >(
    roomId: string,
    options: EnterOptions<TPresence, TStorage>
  ): Room<TPresence, TStorage, TUserMeta, TRoomEvent> {
    const existingRoom = rooms.get(roomId);
    if (existingRoom !== undefined) {
      return existingRoom as Room<TPresence, TStorage, TUserMeta, TRoomEvent>;
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
        delegates: clientOptions.mockedDelegates,
        enableDebugLogging: clientOptions.enableDebugLogging,
        unstable_batchedUpdates: options?.unstable_batchedUpdates,
        liveblocksServer: getServerFromClientOptions(clientOptions),
        authentication: prepareAuthentication(clientOptions, roomId),
        httpSendEndpoint: buildLiveblocksHttpSendEndpoint(
          clientOptions,
          roomId
        ),
        unstable_fallbackToHTTP: !!clientOptions.unstable_fallbackToHTTP,
      }
    );

    rooms.set(roomId, newRoom);

    setupDevTools(() => Array.from(rooms.keys()));
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

    return newRoom;
  }

  function leave(roomId: string) {
    // console.trace("leave");
    unlinkDevTools(roomId);

    const room = rooms.get(roomId);
    if (room !== undefined) {
      room.destroy();
      rooms.delete(roomId);
    }
  }

  return {
    getRoom,
    enter,
    leave,
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

function prepareAuthentication(
  clientOptions: ClientOptions,
  roomId: string
): Authentication {
  const { publicApiKey, authEndpoint } = clientOptions;

  if (authEndpoint !== undefined && publicApiKey !== undefined) {
    throw new Error(
      "You cannot use both publicApiKey and authEndpoint. Please use either publicApiKey or authEndpoint, but not both. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClient"
    );
  }

  if (typeof publicApiKey === "string") {
    if (publicApiKey.startsWith("sk_")) {
      throw new Error(
        "Invalid publicApiKey. You are using the secret key which is not supported. Please use the public key instead. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClientPublicKey"
      );
    } else if (!publicApiKey.startsWith("pk_")) {
      throw new Error(
        "Invalid key. Please use the public key format: pk_<public key>. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClientPublicKey"
      );
    }
    return {
      type: "public",
      publicApiKey,
      url: buildLiveblocksPublicAuthorizeEndpoint(clientOptions, roomId),
    };
  }

  if (typeof authEndpoint === "string") {
    return {
      type: "private",
      url: authEndpoint,
    };
  } else if (typeof authEndpoint === "function") {
    return {
      type: "custom",
      callback: authEndpoint,
    };
  } else if (authEndpoint !== undefined) {
    throw new Error(
      "authEndpoint must be a string or a function. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClientAuthEndpoint"
    );
  }

  throw new Error(
    "Invalid Liveblocks client options. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClient"
  );
}

function buildLiveblocksHttpSendEndpoint(
  options: ClientOptions & { httpSendEndpoint?: string | undefined },
  roomId: string
): string {
  // INTERNAL override for testing purpose.
  if (options.httpSendEndpoint) {
    return options.httpSendEndpoint.replace("{roomId}", roomId);
  }

  return `https://api.liveblocks.io/v2/rooms/${encodeURIComponent(
    roomId
  )}/send-message`;
}

function buildLiveblocksPublicAuthorizeEndpoint(
  options: ClientOptions & { publicAuthorizeEndpoint?: string | undefined },
  roomId: string
): string {
  // INTERNAL override for testing purpose.
  if (options.publicAuthorizeEndpoint) {
    return options.publicAuthorizeEndpoint.replace("{roomId}", roomId);
  }

  return `https://api.liveblocks.io/v2/rooms/${encodeURIComponent(
    roomId
  )}/public/authorize`;
}
