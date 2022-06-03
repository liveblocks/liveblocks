import { errorIf } from "./deprecation";
import type { InternalRoom } from "./room";
import { createRoom } from "./room";
import type {
  Authentication,
  Client,
  ClientOptions,
  Presence,
  Resolve,
  Room,
  RoomInitializers,
} from "./types";

type EnterOptions<TPresence, TStorage> = Resolve<
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
 *     return await response.json();
 *   }
 * });
 */
export function createClient(options: ClientOptions): Client {
  const clientOptions = options;
  const throttleDelay = getThrottleDelayFromOptions(options);

  const rooms = new Map<string, InternalRoom>();

  function getRoom(roomId: string): Room | null {
    const internalRoom = rooms.get(roomId);
    return internalRoom ? internalRoom.room : null;
  }

  function enter<TStorage>(
    roomId: string,
    options: EnterOptions<Presence, TStorage> = {}
  ): Room {
    let internalRoom = rooms.get(roomId);
    if (internalRoom) {
      return internalRoom.room;
    }

    errorIf(
      options.defaultPresence,
      "Argument `defaultPresence` will be removed in @liveblocks/client 0.18. Please use `initialPresence` instead. For more info, see https://bit.ly/3Niy5aP"
    );
    errorIf(
      options.defaultStorageRoot,
      "Argument `defaultStorageRoot` will be removed in @liveblocks/client 0.18. Please use `initialStorage` instead. For more info, see https://bit.ly/3Niy5aP"
    );

    internalRoom = createRoom(
      {
        initialPresence: options.initialPresence,
        initialStorage: options.initialStorage,
        defaultPresence: options.defaultPresence, // Will get removed in 0.18
        defaultStorageRoot: options.defaultStorageRoot, // Will get removed in 0.18
      },
      {
        roomId,
        throttleDelay,
        WebSocketPolyfill: clientOptions.WebSocketPolyfill,
        fetchPolyfill: clientOptions.fetchPolyfill,
        liveblocksServer:
          // TODO Patch this using public but marked internal fields?
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (clientOptions as any)?.liveblocksServer || "wss://liveblocks.net/v6",
        authentication: prepareAuthentication(clientOptions),
      }
    );
    rooms.set(roomId, internalRoom);
    if (!options.DO_NOT_USE_withoutConnecting) {
      // we need to check here because nextjs would fail earlier with Node < 16.
      if (typeof atob === "undefined") {
        // At this point, atob does not exist so we are either on React Native or on Node < 16, hence global is available.
        const base64 = tryRequire(
          "base64Library",
          `"Could not load library {base64Library}. You need to polyfill the atob function. Please follow the instructions at https://liveblocks.io/docs/errors/liveblocks-client/atob-polyfill"`
        );

        global.atob = base64.decode;
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

  function reconnectRooms(rooms: Map<string, InternalRoom>) {
    for (const [, room] of rooms) {
      room.onNavigatorOnline();
    }
  }

  if (isInReactNativeEnvironment()) {
    const NetInfo = tryRequire(
      "@react-native-community/netinfo",
      `Could not load library @react-native-community/netinfo. Please follow the instructions at https://liveblocks.io/docs/errors/liveblocks-client/react-native-netinfo"`
    );

    NetInfo.addEventListener((state: any) => {
      if (state.isInternetReachable) {
        reconnectRooms(rooms);
      }
    });
  } else if (typeof window !== "undefined") {
    // TODO: Expose a way to clear these
    window.addEventListener("online", () => {
      reconnectRooms(rooms);
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
  // TODO: throw descriptive errors for invalid options
  if (typeof clientOptions.publicApiKey === "string") {
    return {
      type: "public",
      publicApiKey: clientOptions.publicApiKey,
      url:
        // TODO Patch this using public but marked internal fields?
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (clientOptions as any).publicAuthorizeEndpoint ||
        "https://liveblocks.io/api/public/authorize",
    };
  } else if (typeof clientOptions.authEndpoint === "string") {
    return {
      type: "private",
      url: clientOptions.authEndpoint,
    };
  } else if (typeof clientOptions.authEndpoint === "function") {
    return {
      type: "custom",
      callback: clientOptions.authEndpoint,
    };
  }

  throw new Error(
    "Invalid Liveblocks client options. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClient"
  );
}

function tryRequire(lib: string, errorMessage: string) {
  let result = null;
  try {
    result = require(lib);
  } catch {
    throw new Error(errorMessage);
  }
  return result;
}

function isInReactNativeEnvironment(): boolean {
  return (
    typeof navigator !== "undefined" && navigator.product === "ReactNative"
  );
}
