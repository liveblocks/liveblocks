/**
 * These utilities are used when deploying an example on liveblocks.io.
 * You can ignore them completely if you run the example locally.
 */

export async function getExampleUserId(id: string, request: Request) {
  const { userId: randomExampleId } = await request.json();
  return `${id}${randomExampleId}`;
}

export function createExampleUserId(
  userIndex?: number | null,
  exampleId?: string | null,
  existingUserId?: string | null
) {
  let userId = existingUserId ?? "user";

  if (typeof userIndex === "number") {
    userId += `-${userIndex}`;
  }

  if (typeof exampleId === "string") {
    userId += `-${exampleId}`;
  }

  return userId;
}

export function authWithExampleId(endpoint: string) {
  return async (room?: string) => {
    const params = new URLSearchParams(window.location.search);
    const exampleId = params.get("exampleId") ?? undefined;
    const examplePreview = Number(params.get("examplePreview"));

    const userId = createExampleUserId(examplePreview, exampleId, "");

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
