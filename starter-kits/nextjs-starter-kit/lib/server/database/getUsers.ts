import { User } from "../../../types";
import { getUser } from "./getUser";

/**
 * Get Users
 *
 * Simulates calling your database and returning a list of user with seeded random colours
 *
 * @param userIds - The user's ids
 */
export async function getUsers(userIds: string[]): Promise<(User | null)[]> {
  const usersPromises: Promise<User | null>[] = [];

  for (const userId of userIds) {
    usersPromises.push(getUser(userId));
  }

  return Promise.all(usersPromises);
}
