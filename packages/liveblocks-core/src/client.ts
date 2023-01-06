import type { LsonObject } from "./crdts/Lson";
import { linkDevTools, setupDevTools, unlinkDevTools } from "./devtools";
import { deprecateIf } from "./lib/deprecation";
import type { Json, JsonObject } from "./lib/Json";
import type { Resolve } from "./lib/Resolve";
import type { Authentication } from "./protocol/Authentication";
import type { BaseUserMeta } from "./protocol/BaseUserMeta";
import type { InternalRoom, Polyfills, Room, RoomInitializers } from "./room";
import { createRoom } from "./room";

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
    options: RoomInitializers<TPresence, TStorage>
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
  throttle?: number;
  polyfills?: Polyfills;

  /**
   * Backward-compatible way to set `polyfills.fetch`.
   */
  fetchPolyfill?: Polyfills["fetch"];

  /**
   * Backward-compatible way to set `polyfills.WebSocket`.
   */
  WebSocketPolyfill?: Polyfills["WebSocket"];
} & (
  | { publicApiKey: string; authEndpoint?: never }
  | { publicApiKey?: never; authEndpoint: AuthEndpoint }
);

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
  const throttleDelay = getThrottleDelayFromOptions(options);

  const rooms = new Map<
    string,
    InternalRoom<JsonObject, LsonObject, BaseUserMeta, Json>
  >();

  function getRoom<
    TPresence extends JsonObject,
    TStorage extends LsonObject = LsonObject,
    TUserMeta extends BaseUserMeta = BaseUserMeta,
    TRoomEvent extends Json = never
  >(roomId: string): Room<TPresence, TStorage, TUserMeta, TRoomEvent> | null {
    const internalRoom = rooms.get(roomId);
    return internalRoom
      ? (internalRoom.room as unknown as Room<
          TPresence,
          TStorage,
          TUserMeta,
          TRoomEvent
        >)
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
    const shouldConnect =
      options.shouldInitiallyConnect === undefined
        ? true
        : options.shouldInitiallyConnect;

    let internalRoom = rooms.get(roomId) as
      | InternalRoom<TPresence, TStorage, TUserMeta, TRoomEvent>
      | undefined;
    if (internalRoom) {
      return internalRoom.room as unknown as Room<
        TPresence,
        TStorage,
        TUserMeta,
        TRoomEvent
      >;
    }

    // console.trace("enter");
    // console.log("enter(", roomId, options, ") called");

    deprecateIf(
      options.initialPresence === null || options.initialPresence === undefined,
      "Please provide an initial presence value for the current user when entering the room."
    );

    internalRoom = createRoom<TPresence, TStorage, TUserMeta, TRoomEvent>(
      {
        initialPresence: options.initialPresence ?? {},
        initialStorage: options.initialStorage,
      },
      {
        roomId,
        throttleDelay,

        polyfills: clientOptions.polyfills,
        WebSocketPolyfill: clientOptions.WebSocketPolyfill, // Backward-compatible API for setting polyfills
        fetchPolyfill: clientOptions.fetchPolyfill, // Backward-compatible API for setting polyfills

        unstable_batchedUpdates: options?.unstable_batchedUpdates,

        liveblocksServer:
          // TODO Patch this using public but marked internal fields?
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (clientOptions as any)?.liveblocksServer ||
          "wss://api.liveblocks.io/v6",
        authentication: prepareAuthentication(clientOptions, roomId),
      }
    );

    rooms.set(
      roomId,
      internalRoom as unknown as InternalRoom<
        JsonObject,
        LsonObject,
        BaseUserMeta,
        Json
      >
    );

    setupDevTools(() => Array.from(rooms.keys()));
    linkDevTools(roomId, internalRoom.room);

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

      internalRoom.connect();
    }

    return internalRoom.room;
  }

  function leave(roomId: string) {
    // console.trace("leave");
    unlinkDevTools(roomId);

    const room = rooms.get(roomId);
    if (room) {
      room.disconnect();
      rooms.delete(roomId);
    }
  }

  if (
    typeof window !== "undefined" &&
    // istanbul ignore next: React Native environment doesn't implement window.addEventListener
    typeof window.addEventListener !== "undefined"
  ) {
    // TODO: Expose a way to clear these
    window.addEventListener("online", () => {
      for (const [, room] of rooms) {
        room.onNavigatorOnline();
      }
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      for (const [, room] of rooms) {
        room.onVisibilityChange(document.visibilityState);
      }
    });
  }

  return {
    getRoom,
    enter,
    leave,
  };
}

function getThrottleDelayFromOptions(options: ClientOptions): number {
  if (options.throttle === undefined) {
    return 100;
  }

  if (
    typeof options.throttle !== "number" ||
    options.throttle < 80 ||
    options.throttle > 1000
  ) {
    throw new Error("throttle should be a number between 80 and 1000.");
  }

  return options.throttle;
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
