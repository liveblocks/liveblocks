import { NextRequest, NextResponse } from "next/server";
import { USER_INFO } from "../../dummy-users";

/**
 * Returns a list of user IDs from a partial search input
 * For `resolveMentionSuggestions` in liveblocks.config.ts
 */

interface User {
  id: string;
  name: string;
  color: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text");

  const userIndices = [...USER_INFO.keys()];
  const users = userIndices.map(
    (userIndex) =>
      ({ id: `user-${userIndex}`, name: USER_INFO[userIndex].name }) as User
  );
  const filteredUserIds = users
    .filter((user) =>
      text ? user.name.toLowerCase().includes(text.toLowerCase()) : true
    )
    .map((user) => user.id);

  return NextResponse.json(filteredUserIds);
}
