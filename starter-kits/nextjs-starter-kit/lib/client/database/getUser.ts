import { DocumentUser, User } from "../../../types";

/**
 * Get User
 *
 * Fetch a user from your database API
 * Uses custom API endpoint
 *
 * @param userId - The user's id
 */
export async function getUser(userId: DocumentUser["id"]): Promise<User> {
  const url = `/api/database/users?userId=${encodeURIComponent(userId)}`;
  const response = await fetch(url);
  return await response.json();
}
