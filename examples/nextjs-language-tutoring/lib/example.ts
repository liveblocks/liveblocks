// Helpers for the liveblocks.io gallery, where several isolated copies of
// this example run from one deployment. `exampleId` isolates each gallery
// session (it's appended to every room id), and `examplePreview` picks a
// distinct demo user per preview pane. You can ignore both when running
// the example locally.

export const EXAMPLE_NAME = "nextjs-language-tutoring";
const BASE_ROOM_ID = `liveblocks:examples:${EXAMPLE_NAME}`;

export type ExampleParams = {
  exampleId: string | null;
  examplePreview: number | null;
};

export function parseExampleParams(
  params: URLSearchParams | null | undefined
): ExampleParams {
  const exampleId = params?.get("exampleId") || null;
  const preview = params?.get("examplePreview");
  const examplePreview =
    preview !== null && preview !== undefined && /^\d+$/.test(preview)
      ? Number(preview)
      : null;
  return { exampleId, examplePreview };
}

// Every room id for this example starts with this prefix
export function getRoomScope(exampleId: string | null) {
  return exampleId
    ? `${BASE_ROOM_ID}-${sanitize(exampleId)}`
    : BASE_ROOM_ID;
}

export function isExampleRoomId(roomId: string) {
  return roomId.startsWith(`${BASE_ROOM_ID}`) && !roomId.endsWith(":users");
}

// The room holding the shared user directory (profiles of Google users)
export function getDirectoryRoomId(exampleId: string | null) {
  return `${getRoomScope(exampleId)}:users`;
}

// Preserve gallery params when navigating within the app
export function withExampleParams(href: string, params: ExampleParams) {
  const search = new URLSearchParams();
  if (params.exampleId) {
    search.set("exampleId", params.exampleId);
  }
  if (params.examplePreview !== null) {
    search.set("examplePreview", String(params.examplePreview));
  }
  const query = search.toString();
  if (!query) {
    return href;
  }
  return href.includes("?") ? `${href}&${query}` : `${href}?${query}`;
}

function sanitize(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
}
