import { NextRequest, NextResponse } from "next/server";
import { getAllUsers } from "../../database";

/**
 * Returns a list of user IDs from a partial search input
 * For `resolveMentionSuggestions` in liveblocks.config.ts
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text") ?? "";
  const query = text.trim().toLowerCase();

  const filteredUserIds = getAllUsers()
    .filter((user) => {
      if (!query) {
        return true;
      }

      const name = user.info.name.toLowerCase();
      const id = user.id.toLowerCase();
      return name.includes(query) || id.includes(query);
    })
    .map((user) => user.id);

  return NextResponse.json(filteredUserIds);
}
