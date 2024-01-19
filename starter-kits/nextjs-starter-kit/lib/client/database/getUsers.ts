import { GetUsersProps, User } from "../../../types";

/**
 * Get Users
 *
 * Fetch a list of users from your database API
 * Uses custom API endpoint
 *
 * @param userIds - The users' ids, or `null` to get all
 * @param searchTerm - The term to filter users by
 */
export async function getUsers({
  userIds,
  search,
}: GetUsersProps): Promise<User[]> {
  let url = `/api/database/users?`;

  if (userIds) {
    const parameters = userIds.map(
      (userId) => `userId=${encodeURIComponent(userId)}`
    );

    if (parameters.length) {
      url += `${parameters.join("&")}`;
    }
  }

  if (search) {
    url += `&search=${search}`;
  }

  const response = await fetch(url);
  return await response.json();
}
