import type { User } from "@/types/data";
import { users } from "@/data/users";

export function getUser(userId: string): User | undefined {
  const user = users.find((user) => user.id === userId);
  if (!user) {
    console.warn(`
      ERROR: User "${userId}" was not found. 
      
      Check that you've added the user to data/users.ts, for example:
      {
        id: "emil.joyce@example.com",
        name: "Emil Joyce",
        color: "#8594F0",
        picture: "https://liveblocks.io/avatars/avatar-6.png",
      },
       
      `);
    return undefined;
  }

  return user;
}

export function searchUsers(text: string): string[] {
  const filteredUserIds = users
    .filter((user) =>
      text ? user.name.toLowerCase().includes(text.toLowerCase()) : true
    )
    .map((user) => user.id);

  return filteredUserIds;
}
