import { colors } from "../../../data/colors";
import { users } from "../../../data/users";
import { User } from "../../../types";
import { getRandom } from "../utils";

/**
 * Get User
 *
 * Simulates calling your database and returning a user with a seeded random colour
 *
 * @param userId - The user's id
 */
export async function getUser(userId: string): Promise<User | null> {
  const user = users.find((user) => user.id === userId);

  if (!user) {
    return null;
  }

  const color = getRandom(colors, userId);

  return { color, ...user };
}
