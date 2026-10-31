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

type ApiInit = RequestInit & { json?: unknown };

// Forwards gallery params (example id, preview user) onto an API request.
async function apiRequest(ctx: ApiContext, path: string, init?: ApiInit) {
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

  return fetch(url, { ...init, headers, body });
}

async function apiError(response: Response) {
  return new ApiError(
    response.status,
    (await response.text()) || response.statusText
  );
}

// Small fetch wrapper that forwards the gallery params to the API routes
export async function api<T>(
  ctx: ApiContext,
  path: string,
  init?: ApiInit
): Promise<T> {
  const response = await apiRequest(ctx, path, init);
  if (!response.ok) {
    throw await apiError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

// Same as `api`, but for binary responses such as a proxied PDF.
export async function apiBytes(ctx: ApiContext, path: string) {
  const response = await apiRequest(ctx, path);
  if (!response.ok) {
    throw await apiError(response);
  }
  return response.arrayBuffer();
}
