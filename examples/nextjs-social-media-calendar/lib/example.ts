import { getRandomUser, getUsers } from "@/app/database";

/**
 * These utilities are used when deploying an example on liveblocks.io, where
 * multiple isolated rooms are created from a single example using an
 * `exampleId`, and each preview pane gets a distinct demo user through
 * `examplePreview`. You can ignore them completely if you run the example
 * locally: a random demo user is picked instead.
 */

export const BASE_ROOM_ID = "liveblocks:examples:nextjs-social-media-calendar";

let cachedUserId: string | null = null;

export function getExampleUserId() {
  if (cachedUserId) {
    return cachedUserId;
  }

  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const examplePreview = params?.get("examplePreview");
  const users = getUsers();

  cachedUserId =
    examplePreview !== null && examplePreview !== undefined
      ? users[Number(examplePreview) % users.length].id
      : getRandomUser().id;

  return cachedUserId;
}

export function getExampleRoomId(exampleId: string | null, subId?: string) {
  const projectRoomId = exampleId
    ? `${BASE_ROOM_ID}-${exampleId}`
    : BASE_ROOM_ID;
  return subId ? `${projectRoomId}:${subId}` : projectRoomId;
}

export function authWithExampleUser(endpoint: string) {
  return async (room?: string) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ room, userId: getExampleUserId() }),
    });

    return await response.json();
  };
}
