import { NextRequest, NextResponse } from "next/server";
import { getUsers } from "@/lib/user";

/**
 * Returns a list of user IDs from a partial search input
 * For `resolveMentionSuggestions` in liveblocks.config.ts
 */

interface User {
  id: string;
  name: string;
}

// TODO WIP
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text") as string;

  const filteredUserIds = getUsers()
    .filter((user) => {
      return user.info.name.toLowerCase().includes(text.toLowerCase());
    })
    .map((user) => user.id);

  /*
  const userIndices = [...getUsers.keys()];
  const users = userIndices.map(
    (userIndex) =>
      ({ id: `user-${userIndex}`, name: getUsers()[userIndex] }) as User
  );
  const filteredUserIds = users
    .filter((user) =>
      text ? user.name.toLowerCase().includes(text.toLowerCase()) : true
    )
    .map((user) => user.id);

 */

  return NextResponse.json(filteredUserIds);
}
