import { NextRequest, NextResponse } from "next/server";
import { getUsers } from "@/database";

/**
 * Returns a list of user IDs from a partial search input
 * For `resolveMentionSuggestions` in liveblocks.config.ts
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text");

  const filteredUserIds = getUsers()
    .filter((user) =>
      text ? user.info.name.toLowerCase().includes(text.toLowerCase()) : true
    )
    .map((user) => user.id);

  return NextResponse.json(filteredUserIds);
}
