import { DocumentGroup, Group } from "../../../types";

/**
 * Get Group
 *
 * Fetch group from your database API
 * Uses custom API endpoint
 *
 * @param groupId - The group's id
 */
export async function getGroup(groupId: DocumentGroup["id"]): Promise<Group> {
  const url = `/api/database/groups?groupId=${encodeURIComponent(groupId)}`;
  const response = await fetch(url);
  return await response.json();
}
