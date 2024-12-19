import type {
  BaseMetadata,
  BaseUserMeta,
  Json,
  JsonObject,
  LsonObject,
  Room,
} from "@liveblocks/client";
import type { OpaqueRoom } from "@liveblocks/core";
import { createContext, useContext } from "react";

/**
 * Raw access to the React context where the RoomProvider stores the current
 * room. Exposed for advanced use cases only.
 *
 * @private This is a private/advanced API. Do not rely on it.
 */
export const RoomContext = createContext<OpaqueRoom | null>(null);

/** @private */
export function useRoomOrNull<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  M extends BaseMetadata,
>(): Room<P, S, U, E, M> | null {
  return useContext(RoomContext) as Room<P, S, U, E, M> | null;
}

/**
 * Returns whether the hook is called within a RoomProvider context.
 *
 * @example
 * const isInsideRoom = useIsInsideRoom();
 */
export function useIsInsideRoom(): boolean {
  const room = useRoomOrNull();
  return room !== null;
}
