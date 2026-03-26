import { AI_AGENT_USER, USERS } from "@/database";
import { NextRequest, NextResponse } from "next/server";

/**
 * Returns a list of user IDs from a partial search input
 * For `resolveMentionSuggestions` in liveblocks.config.ts
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text") as string;

  const filteredUserIds = [AI_AGENT_USER, ...USERS]
    .filter((user) => {
      return user.info.name.toLowerCase().includes(text.toLowerCase());
    })
    .map((user) => user.id);

  return NextResponse.json(filteredUserIds);
}
