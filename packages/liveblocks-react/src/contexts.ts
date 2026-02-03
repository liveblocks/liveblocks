import type {
  BaseMetadata,
  BaseUserMeta,
  Client,
  Json,
  JsonObject,
  LsonObject,
  Room,
} from "@liveblocks/client";
import type { OpaqueClient, OpaqueRoom } from "@liveblocks/core";
import { raise } from "@liveblocks/core";
import { type Context, createContext, useContext } from "react";

/**
 * Raw access to the React context where the LiveblocksProvider stores the
 * current client. Exposed for advanced use cases only.
 *
 * @private This is a private/advanced API. Do not rely on it.
 */
export const ClientContext = createContext<OpaqueClient | null>(null);

/**
 * @private This is an internal API.
 */
export function useClientOrNull<U extends BaseUserMeta>() {
  return useContext(ClientContext) as Client<U> | null;
}

/**
 * Obtains a reference to the current Liveblocks client.
 */
export function useClient<U extends BaseUserMeta>() {
  return (
    useClientOrNull<U>() ??
    raise("LiveblocksProvider is missing from the React tree.")
  );
}

/**
 * Raw access to the React context where the RoomProvider stores the current
 * room. Exposed for advanced use cases only.
 *
 * @private This is a private/advanced API. Do not rely on it.
 */
export const GlobalRoomContext = createContext<OpaqueRoom | null>(null);

/** @private */
export function useRoomOrNull<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  TM extends BaseMetadata,
  CM extends BaseMetadata,
>(
  RoomContext: Context<OpaqueRoom | null> = GlobalRoomContext
): Room<P, S, U, E, TM, CM> | null {
  return useContext(RoomContext) as Room<P, S, U, E, TM, CM> | null;
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
