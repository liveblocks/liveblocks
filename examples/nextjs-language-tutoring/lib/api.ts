import type { ExampleParams } from "./example";
import type { LessonRoom } from "./liveblocks-server";

export type { LessonRoom, RoomMember } from "./liveblocks-server";

export type LessonRoomDetails = LessonRoom & { inviteToken: string | null };

// Set by the client in gallery preview mode, see `lib/request-user.ts`
const PREVIEW_USER_HEADER = "x-preview-user-id";

export type ApiContext = ExampleParams & { previewUserId: string | null };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

// Small fetch wrapper that forwards the gallery params to the API routes
export async function api<T>(
  ctx: ApiContext,
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const url = new URL(path, window.location.origin);
  if (ctx.exampleId) {
    url.searchParams.set("exampleId", ctx.exampleId);
  }

  const headers = new Headers(init?.headers);
  if (ctx.previewUserId) {
    headers.set(PREVIEW_USER_HEADER, ctx.previewUserId);
  }
  let body = init?.body;
  if (init?.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }

  const response = await fetch(url, { ...init, headers, body });
  if (!response.ok) {
    throw new ApiError(
      response.status,
      (await response.text()) || response.statusText
    );
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
