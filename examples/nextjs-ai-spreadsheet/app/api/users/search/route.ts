import { NextRequest, NextResponse } from "next/server";
import { getUsers } from "@/database";

/**
 * Returns a list of user IDs from a partial search input.
 * For `resolveMentionSuggestions` in Providers.tsx (used by Comments).
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = (searchParams.get("text") ?? "").toLowerCase();

  const filteredUserIds = getUsers()
    .filter((user) => user.info.name.toLowerCase().includes(text))
    .map((user) => user.id);

  return NextResponse.json(filteredUserIds);
}
