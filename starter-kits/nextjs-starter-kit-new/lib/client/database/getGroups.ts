import { DocumentGroup, Group } from "../../../types";

/**
 * Get Groups
 *
 * Fetch groups from your database API
 * Uses custom API endpoint
 *
 * @param groupIds - The groups' ids
 */
export async function getGroups(
  groupIds: DocumentGroup["id"][]
): Promise<Group[]> {
  const parameters = groupIds.map(
    (groupId) => `groupId=${encodeURIComponent(groupId)}`
  );
  let url = `/api/database/groups?`;

  if (parameters.length) {
    url += `${parameters.join("&")}`;
  }

  const response = await fetch(url);
  return await response.json();
}
