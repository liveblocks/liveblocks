import { AI_USER_INFO, getUsers } from "@/database";
import { NextRequest, NextResponse } from "next/server";

/**
 * Returns a list of user IDs from a partial search input
 * For `resolveMentionSuggestions` in liveblocks.config.ts
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text") as string;

  const aiEnabled = Boolean(process.env.LIVEBLOCKS_WEBHOOK_SECRET_KEY);

  const filteredUserIds = getUsers()
    .filter((user) => {
      if (!aiEnabled && user.id === AI_USER_INFO.id) {
        return false;
      }
      return user.info.name.toLowerCase().includes(text.toLowerCase());
    })
    .map((user) => user.id);

  return NextResponse.json(filteredUserIds);
}
