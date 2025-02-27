import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "../../../database";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 */

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const { userId: providedUserId, tenantId } = await request.json();

  const userId = providedUserId ?? `user-${Math.round(Math.random())}`;
  const user = await getUser(userId);

  if (!user) {
    return new NextResponse("Invalid user", { status: 403 });
  }

  // Create a session for the current user (access token auth), either with a provided user ID or a random one
  const res = await liveblocks.identifyUser(
    {
      userId,
      groupIds: [
        // This groupId is set on all public rooms for this tenant
        `${tenantId}:all`,
        // This groupId is set on private rooms the user has access to for this tenant
        `${tenantId}:${userId}`,
      ],
    },
    {
      userInfo: user.info,
    }
  );

  return new NextResponse(res.body, { status: res.status });
}
