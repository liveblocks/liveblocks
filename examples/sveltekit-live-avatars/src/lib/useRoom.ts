import { getContext } from "svelte";
import type { Room } from "@liveblocks/client";
import { roomSymbol } from "./symbols";

/**
 * Works similarly to `liveblocks-react` useRoom
 * https://liveblocks.io/docs/api-reference/liveblocks-react#useRoom
 *
 * This does NOT return a Svelte store, just the plain room object
 * const room = useRoom()
 * room.history.undo()
 */
export function useRoom(): Room {
  const room = getContext<Room>(roomSymbol);

  if (!room) {
    throw new Error("Use RoomProvider as parent with id prop");
  }

  return room;
}
