import { NextRequest, NextResponse } from "next/server";
import { resolveUserInfos } from "@/lib/liveblocks-server";
import { getExampleId } from "@/lib/request-user";

// Resolves user ids to their info (name, avatar, color), used by
// `resolveUsers` in `app/providers.tsx` and by the home page's member lists.
export async function GET(request: NextRequest) {
  // Accepts both `?userIds=a&userIds=b` and `?userIds=a,b`
  const userIds = request.nextUrl.searchParams
    .getAll("userIds")
    .flatMap((value) => value.split(","))
    .map((id) => id.trim())
    .filter(Boolean);
  if (userIds.length === 0) {
    return new NextResponse("Missing userIds", { status: 400 });
  }

  const profiles = await resolveUserInfos(userIds, getExampleId(request));
  return NextResponse.json(userIds.map((id) => profiles.get(id) ?? null));
}
