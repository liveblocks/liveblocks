import { errorIf } from "./deprecation";
import type { InternalRoom } from "./room";
import { createRoom } from "./room";
import type {
  Authentication,
  BaseUserMeta,
  Client,
  ClientOptions,
  Json,
  JsonObject,
  LsonObject,
  Resolve,
  Room,
  RoomInitializers,
} from "./types";

type EnterOptions<
  TPresence extends JsonObject,
  TStorage extends LsonObject
> = Resolve<
  // Enter options are just room initializers, plus an internal option
  RoomInitializers<TPresence, TStorage> & {
    /**
     * INTERNAL OPTION: Only used in a SSR context when you want an empty room
     * to make sure your react tree is rendered properly without connecting to
     * websocket
     */
    DO_NOT_USE_withoutConnecting?: boolean;
  }
>;

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
    TStorage extends LsonObject,
    TUserMeta extends BaseUserMeta,
    TEvent extends Json
  >(roomId: string): Room<TPresence, TStorage, TUserMeta, TEvent> | null {
    const internalRoom = rooms.get(roomId);
    return internalRoom
      ? (internalRoom.room as unknown as Room<
          TPresence,
          TStorage,
          TUserMeta,
          TEvent
        >)
      : null;
  }

  function enter<
    TPresence extends JsonObject,
    TStorage extends LsonObject,
    TUserMeta extends BaseUserMeta,
    TEvent extends Json
  >(
    roomId: string,
    options: EnterOptions<TPresence, TStorage> = {}
  ): Room<TPresence, TStorage, TUserMeta, TEvent> {
    let internalRoom = rooms.get(roomId) as
      | InternalRoom<TPresence, TStorage, TUserMeta, TEvent>
      | undefined;
    if (internalRoom) {
      return internalRoom.room as unknown as Room<
        TPresence,
        TStorage,
        TUserMeta,
        TEvent
      >;
    }

    errorIf(
      options.defaultPresence,
      "Argument `defaultPresence` will be removed in @liveblocks/client 0.18. Please use `initialPresence` instead. For more info, see https://bit.ly/3Niy5aP"
    );
    errorIf(
      options.defaultStorageRoot,
      "Argument `defaultStorageRoot` will be removed in @liveblocks/client 0.18. Please use `initialStorage` instead. For more info, see https://bit.ly/3Niy5aP"
    );

    internalRoom = createRoom<TPresence, TStorage, TUserMeta, TEvent>(
      {
        initialPresence: options.initialPresence,
        initialStorage: options.initialStorage,
        defaultPresence: options.defaultPresence, // Will get removed in 0.18
        defaultStorageRoot: options.defaultStorageRoot, // Will get removed in 0.18
      },
      {
        roomId,
        throttleDelay,

        polyfills: clientOptions.polyfills,
        WebSocketPolyfill: clientOptions.WebSocketPolyfill, // Backward-compatible API for setting polyfills
        fetchPolyfill: clientOptions.fetchPolyfill, // Backward-compatible API for setting polyfills

        liveblocksServer:
          // TODO Patch this using public but marked internal fields?
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (clientOptions as any)?.liveblocksServer || "wss://liveblocks.net/v6",
        authentication: prepareAuthentication(clientOptions),
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
    if (!options.DO_NOT_USE_withoutConnecting) {
      // we need to check here because nextjs would fail earlier with Node < 16
      if (typeof atob == "undefined") {
        if (clientOptions.polyfills?.atob == undefined) {
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
    const room = rooms.get(roomId);
    if (room) {
      room.disconnect();
      rooms.delete(roomId);
    }
  }

  if (
    typeof window !== "undefined" &&
    typeof window.addEventListener !== "undefined" // e.g. React Native environment doesn't implement window.addEventListener
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

function prepareAuthentication(clientOptions: ClientOptions): Authentication {
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
      url:
        // TODO Patch this using public but marked internal fields?
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (clientOptions as any).publicAuthorizeEndpoint ||
        "https://liveblocks.io/api/public/authorize",
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
