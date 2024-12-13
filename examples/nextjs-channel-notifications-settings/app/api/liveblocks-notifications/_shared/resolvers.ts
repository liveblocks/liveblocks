import type { ResolveUsersArgs } from "@liveblocks/core";
import type { ResolveRoomInfoArgs } from "@liveblocks/emails";

import { USER_INFO } from "../../dummy-users";
import { company } from "./metadata";

export async function resolveUsers({ userIds }: ResolveUsersArgs) {
  const indices = [...USER_INFO.keys()];
  const users = new Map();

  for (const index of indices) {
    users.set(`user-${index}`, USER_INFO[index]);
  }

  return userIds.map((userId) => users.get(userId)).filter(Boolean);
}

export async function resolveRoomInfo({ roomId }: ResolveRoomInfoArgs) {
  return {
    name: roomId,
    url: `${company.url}/?exampleId=${roomId}`,
  };
}
