import { NextRequest, NextResponse } from "next/server";
import { NAMES } from "../../../../database";

/**
 * Returns a list of user IDs from a partial search input
 * For `resolveMentionSuggestions` in liveblocks.config.ts
 */

interface User {
  id: string;
  name: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  const userIndices = [...NAMES.keys()];
  const users = userIndices.map(
    (userIndex) => ({ id: `user-${userIndex}`, name: NAMES[userIndex] }) as User,
  );
  const filteredUserIds = users
    .filter((user) =>
      search ? user.name.toLowerCase().includes(search.toLowerCase()) : true,
    )
    .map((user) => user.id);

  return NextResponse.json(filteredUserIds);
}
