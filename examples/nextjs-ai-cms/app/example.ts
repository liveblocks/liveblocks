/**
 * These utilities are used when deploying an example on liveblocks.io.
 * You can ignore them completely if you run the example locally.
 */

export function authWithRandomUser(endpoint: string) {
  return async (room?: string) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ room }),
    });
    return await response.json();
  };
}
