const PLACEHOLDER_BASE_URL = "https://localhost:9999";
const ABSOLUTE_URL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/;

/**
 * These utilities are used when deploying an example on liveblocks.io.
 * You can ignore them completely if you run the example locally.
 */

export function createExampleRoomId(room: string) {
  return `liveblocks:examples:nextjs-comments-notifications:${room}`;
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

export function setExampleId(url: string) {
  const params = new URLSearchParams(window.location.search);
  const exampleId = params.get("exampleId") ?? undefined;

  return setQueryParams(url, { exampleId });
}

export function authWithExampleId(endpoint: string) {
  return async (room?: string) => {
    const tenantId = window.location.pathname.split("/")[1];
    const userId = getUserId();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ room, userId, tenantId }),
    });
    return await response.json();
  };
}

export function getUserId() {
  const params = new URLSearchParams(window.location.search);
  const exampleId = params.get("exampleId") ?? undefined;
  const examplePreview = Number(params.get("examplePreview"));

  const userId = createExampleUserId(examplePreview, exampleId);
  return userId;
}

export function setQueryParams(
  url: string,
  params: Record<string, string | number | boolean | null | undefined>
) {
  const isAbsolute = ABSOLUTE_URL_REGEX.test(url);
  const absoluteUrl = new URL(
    url,
    isAbsolute ? undefined : PLACEHOLDER_BASE_URL
  );

  for (const [param, value] of Object.entries(params)) {
    if (value === undefined) {
      absoluteUrl.searchParams.delete(param);
    } else {
      absoluteUrl.searchParams.set(param, String(value));
    }
  }

  return isAbsolute
    ? absoluteUrl.href
    : absoluteUrl.href.replace(PLACEHOLDER_BASE_URL, "");
}

export function capitalize(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
