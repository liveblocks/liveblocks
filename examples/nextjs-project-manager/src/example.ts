import { getUser, getRandomUser } from "./database";

/**
 * These utilities are used when deploying an example on liveblocks.io.
 * You can ignore them completely if you run the example locally.
 */

const userId = getRandomUser().id;

export function authWithRandomUser(endpoint: string) {
  return async (room?: string) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ room, userId }),
    });
    return await response.json();
  };
}

export async function getSession(request: Request) {
  const { userId } = await request.json();
  const user = getUser(userId);

  if (!user) {
    throw Error("User not found");
  }

  return user;
}
