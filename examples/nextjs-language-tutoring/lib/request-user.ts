import type { NextRequest } from "next/server";
import { getSessionUser, type SessionUser } from "./auth";
import { getDemoUser } from "./demo-login";

// Header set by the client in liveblocks.io gallery preview mode, where each
// preview pane is a different demo user but all panes share one cookie jar.
// It's only ever honoured for demo users, never for Google accounts.
export const PREVIEW_USER_HEADER = "x-preview-user-id";

export async function getRequestUser(
  request: NextRequest
): Promise<SessionUser | undefined> {
  const previewUserId = request.headers.get(PREVIEW_USER_HEADER);
  if (previewUserId) {
    const demoUser = getDemoUser(previewUserId);
    return demoUser ? { ...demoUser, external: false } : undefined;
  }
  return getSessionUser(request.headers);
}

export function getExampleId(request: NextRequest) {
  return request.nextUrl.searchParams.get("exampleId") || null;
}
