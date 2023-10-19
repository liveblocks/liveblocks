import { DocumentUser, User } from "../../../types";

/**
 * Get Users
 *
 * Fetch a list of users from your database API
 * Uses custom API endpoint
 *
 * @param userIds - The users' ids
 */
export async function getUsers(userIds: DocumentUser["id"][]): Promise<User[]> {
  const parameters = userIds.map(
    (userId) => `userId=${encodeURIComponent(userId)}`
  );
  let url = `/api/database/users?`;

  if (parameters.length) {
    url += `${parameters.join("&")}`;
  }

  const response = await fetch(url);
  return await response.json();
}
