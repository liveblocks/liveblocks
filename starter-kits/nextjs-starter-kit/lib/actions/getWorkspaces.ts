"use server";

import { auth } from "@/auth";
import { getWorkspaces as getWorkspacesFromDb } from "@/lib/database/getWorkspaces";
import { Workspace } from "@/types";

/**
 * Get Workspaces
 *
 * Fetch workspaces for the current authenticated user from your database
 */
export async function getWorkspaces(): Promise<Workspace[]> {
  const session = await auth();

  // If user is authenticated, get their workspaces
  if (session?.user?.info?.id) {
    const workspaces = await getWorkspacesFromDb({
      userId: session.user.info.id,
    });
    return workspaces.filter((w) => w !== null) as Workspace[];
  }

  // Otherwise return empty array
  return [];
}
