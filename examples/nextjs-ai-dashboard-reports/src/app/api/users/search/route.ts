import { NextRequest, NextResponse } from "next/server";
import { getAllUsers } from "../../database";

/**
 * Returns a list of user IDs from a partial search input
 * For `resolveMentionSuggestions` in liveblocks.config.ts
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text") ?? "";

  const q = text.trim().toLowerCase();
  if (!q) {
    return NextResponse.json([]);
  }

  const filteredUserIds = getAllUsers()
    .filter((user) => {
      const name = user.info.name.toLowerCase();
      const id = user.id.toLowerCase();
      return name.includes(q) || id.includes(q);
    })
    .map((user) => user.id);

  return NextResponse.json(filteredUserIds);
}
