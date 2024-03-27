import { colors } from "@/data/colors";
import { users } from "@/data/users";

/**
 * Get User
 *
 * Simulates calling your database and returning a user with a seeded random colour
 *
 * @param userId - The user's id
 */
export async function getUser(userId: string) {
  const user = users.find((user) => user.id === userId);

  if (!user) {
    console.warn(`
ERROR: User "${userId}" was not found. 

Check that you've added the user to data/users.ts, for example:
{
  id: "${userId}",
  name: "Tchoka Ahoki",
  avatar: "https://liveblocks.io/avatars/avatar-7.png",
  groupIds: ["product", "engineering", "design"],
},
 
`);
    return null;
  }

  const color = getRandom(colors, userId);
  return { color, ...user };
}

export function getRandom<T>(array: T[], seed?: string): T {
  const index = seed
    ? Math.abs(hashCode(seed)) % array.length
    : Math.floor(Math.random() * array.length);

  return array[index];
}

function hashCode(string: string) {
  let hash = 0;

  if (string.length > 0) {
    let index = 0;

    while (index < string.length) {
      hash = ((hash << 5) - hash + string.charCodeAt(index++)) | 0;
    }
  }

  return hash;
}
