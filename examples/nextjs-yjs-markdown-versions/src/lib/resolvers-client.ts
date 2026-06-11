import type { ResolveUsersArgs, ResolveRoomsInfoArgs } from "@liveblocks/client";

export async function resolveUsers({ userIds }: ResolveUsersArgs) {
  return userIds.map((id) => ({
    name: id.replace(/^gh_/, "@"),
    picture: "",
    color: "#888",
  }));
}

export async function resolveRoomsInfo({ roomIds }: ResolveRoomsInfoArgs) {
  return roomIds.map((roomId) => ({
    title: roomId.split(":").pop() ?? roomId,
    ownerName: "",
  }));
}
