import { NextRequest, NextResponse } from "next/server";
import { searchUsers } from "@/lib/liveblocks-server";
import { getExampleId } from "@/lib/request-user";

// Returns user ids matching the search text, used by
// `resolveMentionSuggestions` in `app/providers.tsx`.
export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get("text") ?? "";
  const userIds = await searchUsers(text, getExampleId(request));
  return NextResponse.json(userIds);
}
