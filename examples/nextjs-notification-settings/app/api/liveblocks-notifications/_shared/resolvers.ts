import type { ResolveUsersArgs } from "@liveblocks/core";
import type { ResolveRoomInfoArgs } from "@liveblocks/emails";

import { getUser } from "@/lib/database";
import { company } from "./metadata";

export async function resolveUsers({ userIds }: ResolveUsersArgs) {
  return userIds.map((userId) => getUser(userId)).filter(Boolean);
}

export async function resolveRoomInfo({ roomId }: ResolveRoomInfoArgs) {
  return {
    name: roomId,
    url: `${company.url}/?exampleId=${roomId}`,
  };
}
