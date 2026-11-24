import { NextRequest, NextResponse } from "next/server";
import { getRandomUser, getUser } from "@/app/database";
import { getLiveblocks, isLiveblocksConfigured } from "@/lib/server/liveblocks";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/api-reference/authentication
 */

export async function POST(request: NextRequest) {
  if (!isLiveblocksConfigured()) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const liveblocks = getLiveblocks();

  // The client tells us which demo agent it wants to be. In a real app you'd
  // read the authenticated user from your session instead.
  const { userId } = (await request.json().catch(() => ({}))) as {
    userId?: string;
  };

  const user = userId ? getUser(userId) : getRandomUser();

  if (!user) {
    return new NextResponse("User not found", { status: 403 });
  }

  const session = liveblocks.prepareSession(user.id, {
    userInfo: user.info,
  });

  // Use a naming pattern to allow access to rooms with a wildcard
  session.allow("liveblocks:examples:*", ["*:write"]);

  const { status, body } = await session.authorize();
  return new NextResponse(body, { status });
}
