import { createRoom, InternalRoom } from "./room";
import { ClientOptions, Room, Client, Presence } from "./types";

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

  if (typeof clientOptions.throttle === "number") {
    if (clientOptions.throttle < 80 || clientOptions.throttle > 1000) {
      throw new Error(
        "Liveblocks client throttle should be between 80 and 1000 ms"
      );
    }
  }

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
      WebSocketPolyfill: typeof WebSocket
    } = {WebSocketPolyfill: WebSocket}
  ): Room {
    let internalRoom = rooms.get(roomId);
    if (internalRoom) {
      return internalRoom.room;
    }
    internalRoom = createRoom(roomId, { ...clientOptions, ...options });
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
