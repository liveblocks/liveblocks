import { workspaces } from "@/data/workspaces";
import { Workspace } from "@/types";
import { getUser } from "./getUser";

type Props = {
  workspaceIds?: string[];
  userId?: string;
};

/**
 * Get Workspaces
 *
 * Simulates calling your database and returning a list of workspaces
 *
 * @param workspaceIds - The workspace ids to get (optional)
 * @param userId - The user id to get workspaces for (optional)
 */
export async function getWorkspaces({
  workspaceIds,
  userId,
}: Props = {}): Promise<(Workspace | null)[]> {
  // If userId is provided, get workspaces for that user
  if (userId) {
    const user = await getUser(userId);
    if (!user) {
      return [];
    }
    const userWorkspaceIds = user.workspaceIds || [];
    return workspaces
      .filter((workspace) => userWorkspaceIds.includes(workspace.id))
      .map((workspace) => workspace);
  }

  // If workspaceIds provided, filter by those
  if (workspaceIds) {
    return workspaces
      .filter((workspace) => workspaceIds.includes(workspace.id))
      .map((workspace) => workspace);
  }

  // Otherwise return all workspaces
  return workspaces.map((workspace) => workspace);
}

