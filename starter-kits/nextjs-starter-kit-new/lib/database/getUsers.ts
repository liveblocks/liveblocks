import { users } from "@/data/users";
import { Document, User } from "@/types";
import { getUser } from "./getUser";

type Props = {
  userIds?: Document["id"][];
  search?: string;
};

/**
 * Get Users
 *
 * Simulates calling your database and returning a list of user with seeded random colours
 *
 * @param userIds - The user's ids to get
 * @param searchTerm - The term to filter your users by, checks users' ids and names
 */
export async function getUsers({ userIds, search }: Props) {
  const usersPromises: Promise<User | null>[] = [];

  // Filter by userIds or get all users
  if (userIds) {
    for (const userId of userIds) {
      usersPromises.push(getUser(userId));
    }
  } else {
    const allUserIds = users.map((user) => user.id);
    for (const userId of allUserIds) {
      usersPromises.push(getUser(userId));
    }
  }

  const userList = await Promise.all(usersPromises);

  // If search term, check if term is included in name or id, and filter
  if (search) {
    const term = search.toLowerCase();

    return userList.filter((user) => {
      if (!user) {
        return false;
      }

      return (
        user.name.toLowerCase().includes(term) ||
        user.id.toLowerCase().includes(term)
      );
    });
  }

  return userList;
}
