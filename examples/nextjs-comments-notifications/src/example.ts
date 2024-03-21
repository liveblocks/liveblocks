import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

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

export function useExampleUserId() {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");
  const examplePreview = params?.get("examplePreview");
  const userId = useMemo(() => {
    return createExampleUserId(Number(examplePreview), exampleId);
  }, [exampleId, examplePreview]);

  return userId;
}

export function useExampleRoomId(room: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");
  const roomId = useMemo(() => createExampleRoomId(room), [room]);
  const exampleRoomId = useMemo(() => {
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [roomId, exampleId]);

  return exampleRoomId;
}

export function setExampleId(url: string) {
  const params = new URLSearchParams(window.location.search);
  const exampleId = params.get("exampleId");

  return setQueryParams(url, { exampleId });
}

export function authWithExampleId(endpoint: string) {
  return async (room?: string) => {
    const params = new URLSearchParams(window.location.search);
    const exampleId = params.get("exampleId");
    const examplePreview = Number(params.get("examplePreview"));

    const userId = createExampleUserId(examplePreview, exampleId);

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
