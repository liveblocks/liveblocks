import { NextRequest, NextResponse } from "next/server";
import { getUsers } from "@/database";

/**
 * Returns matching user IDs for mentions.
 * Used by resolveMentionSuggestions in Providers.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = (searchParams.get("text") ?? "").toLowerCase();

  const filteredUserIds = getUsers()
    .filter((user) => user.info.name.toLowerCase().includes(text))
    .map((user) => user.id);

  return NextResponse.json(filteredUserIds);
}
