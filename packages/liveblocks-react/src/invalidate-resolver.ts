import { kInternal, type OpaqueClient } from "@liveblocks/core";

import { invalidateResolvedMentionSuggestions } from "./use-mention-suggestions";

export function invalidateResolver(
  client: OpaqueClient,
  resolver: "resolveMentionSuggestions"
): void;
export function invalidateResolver(
  client: OpaqueClient,
  resolver: "resolveUsers",
  userId: string
): void;
export function invalidateResolver(
  client: OpaqueClient,
  resolver: "resolveRoomsInfo",
  roomId: string
): void;
export function invalidateResolver(
  client: OpaqueClient,
  resolver: "resolveUsers" | "resolveRoomsInfo" | "resolveMentionSuggestions",
  id?: string
): void {
  switch (resolver) {
    case "resolveUsers":
      client[kInternal].usersStore.invalidate(id!);
      break;
    case "resolveRoomsInfo":
      client[kInternal].roomsInfoStore.invalidate(id!);
      break;
    case "resolveMentionSuggestions":
      invalidateResolvedMentionSuggestions(client);
      break;
  }
}
