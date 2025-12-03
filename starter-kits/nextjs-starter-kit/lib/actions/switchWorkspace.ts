"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";

const WORKSPACE_COOKIE_NAME = "currentWorkspaceId";

/**
 * Switch Workspace
 *
 * Updates the current workspace/tenant for the authenticated user
 * Stores the workspace in a cookie which is then read in auth callbacks
 *
 * @param workspaceId - The workspace/tenant ID to switch to
 */
export async function switchWorkspace(workspaceId: string) {
  const session = await auth();

  if (!session) {
    return {
      error: {
        code: 401,
        message: "Not signed in",
        suggestion: "Sign in to switch workspaces",
      },
    };
  }

  // Verify user has access to this workspace
  const userWorkspaceIds = session.user.info.workspaceIds || [];
  if (!userWorkspaceIds.includes(workspaceId)) {
    return {
      error: {
        code: 403,
        message: "Access denied",
        suggestion: "You don't have access to this workspace",
      },
    };
  }

  // Store workspace in cookie
  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE_NAME, workspaceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });

  return { success: true };
}

/**
 * Get Workspace ID from Cookie
 *
 * Gets the current workspace/tenant ID from the cookie.
 * Used in server-side auth callbacks.
 *
 * @returns The workspace/tenant ID or null if not set
 */
export async function getWorkspaceIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(WORKSPACE_COOKIE_NAME)?.value || null;
}
