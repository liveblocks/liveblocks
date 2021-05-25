import { createRoom } from "./room";
import { ClientOptions, Room, Client, Presence } from "./types";

export function createClient(options: ClientOptions): Client {
  if (typeof options.throttle === "number") {
    if (options.throttle < 80 || options.throttle > 1000) {
      throw new Error(
        "Liveblocks client throttle should be between 80 and 1000 ms"
      );
    }
  }

  const rooms = new Map<string, Room>();

  function getRoom(roomId: string): Room | null {
    return rooms.get(roomId) || null;
  }

  function enter(roomId: string, initialPresence?: Presence) {
    let room = rooms.get(roomId);
    if (room) {
      return room;
    }
    room = createRoom(roomId, { ...options, initialPresence });
    rooms.set(roomId, room);
    room.connect();
    return room;
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
        (room as any)._onNavigatorOnline();
      }
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      for (const [, room] of rooms) {
        (room as any)._onVisibilityChange(document.visibilityState);
      }
    });
  }

  return {
    getRoom,
    enter,
    leave,
  };
}
