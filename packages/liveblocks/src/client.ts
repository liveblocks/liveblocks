import { createRoom, InternalRoom } from "./room";
import {
  ClientOptions,
  Room,
  Client,
  Presence,
  GlobalOptions,
  AuthorizeResponse,
} from "./types";

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
  const globalOptions = prepareGlobalOptions(options);

  const rooms = new Map<string, InternalRoom>();

  function getRoom(roomId: string): Room | null {
    const internalRoom = rooms.get(roomId);
    return internalRoom ? internalRoom.room : null;
  }

  function enter<TStorageRoot>(
    roomId: string,
    options: {
      defaultPresence?: Presence;
      defaultStorageRoot?: TStorageRoot;
    } = {}
  ): Room {
    let internalRoom = rooms.get(roomId);
    if (internalRoom) {
      return internalRoom.room;
    }
    internalRoom = createRoom(roomId, {
      ...globalOptions,
      ...{
        defaultPresence: options.defaultPresence,
        defaultStorageRoot: options.defaultStorageRoot,
      },
    });
    rooms.set(roomId, internalRoom);
    internalRoom.connect();
    return internalRoom.room;
  }

  function leave(roomId: string) {
    let room = rooms.get(roomId);
    if (room) {
      room.disconnect();
      rooms.delete(roomId);
    }
  }

  if (typeof window !== "undefined") {
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

function fetchAuthorize(
  fetch: typeof window.fetch,
  endpoint: string,
  publicApiKey?: string
): (room: string) => Promise<{ token: string }> {
  return async (room: string) => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room,
        publicApiKey,
      }),
    });

    if (!res.ok) {
      throw new AuthenticationError(
        `Authentication error. Liveblocks could not parse the response of your authentication "${endpoint}"`
      );
    }

    let authResponse = null;
    try {
      authResponse = await res.json();
    } catch (er) {
      throw new AuthenticationError(
        `Authentication error. Liveblocks could not parse the response of your authentication "${endpoint}"`
      );
    }

    if (typeof authResponse.token !== "string") {
      throw new AuthenticationError(
        `Authentication error. Liveblocks could not parse the response of your authentication "${endpoint}"`
      );
    }

    return authResponse;
  };
}

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

function prepareGlobalOptions(options: ClientOptions): GlobalOptions {
  if (options.throttle === undefined) {
    options.throttle = 80;
  }

  if (
    typeof options.throttle !== "number" ||
    options.throttle < 80 ||
    options.throttle > 1000
  ) {
    throw new Error("throttle should be a number between 80 and 1000.");
  }

  if (typeof window === "undefined" && options.WebSocketPolyfill == null) {
    throw new Error(
      "To use Liveblocks client in a non-dom environment, you need to provide a WebSocket polyfill."
    );
  }

  let authEndpoint: (room: string) => Promise<AuthorizeResponse>;

  if (typeof options.publicApiKey === "string") {
    if (typeof window === "undefined" && options.fetchPolyfill == null) {
      throw new Error(
        "To use Liveblocks client in a non-dom environment with a publicApiKey, you need to provide a fetch polyfill."
      );
    }

    authEndpoint = fetchAuthorize(
      options.fetchPolyfill || fetch,
      (options as any).publicAuthorizeEndpoint ||
        "https://liveblocks.io/api/public/authorize",
      options.publicApiKey
    );
  } else if (typeof options.authEndpoint === "string") {
    if (typeof window === "undefined" && options.fetchPolyfill == null) {
      throw new Error(
        "To use Liveblocks client in a non-dom environment with a url as auth endpoint, you need to provide a fetch polyfill."
      );
    }

    authEndpoint = fetchAuthorize(
      options.fetchPolyfill || fetch,
      options.authEndpoint
    );
  } else if (typeof options.authEndpoint === "function") {
    authEndpoint = options.authEndpoint;
  } else {
    // TODO: Better error message
    throw new Error("Invalid Liveblocks client config.");
  }

  return {
    WebSocket: options.WebSocketPolyfill || WebSocket,
    throttle: options.throttle || 100,
    authEndpoint,
    liveblocksServer:
      (options as any).liveblocksServer || "wss://liveblocks.net/v5",
  };
}
