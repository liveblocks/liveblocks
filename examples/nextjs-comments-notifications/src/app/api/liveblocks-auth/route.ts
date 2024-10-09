import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "../../../database";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 */

const liveblocks = new Liveblocks({
  // @ts-expect-error dev
  baseUrl: "https://dev.dev-liveblocks5948.workers.dev",
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const { userId: providedUserId } = await request.json();

  const userId = providedUserId ?? `user-${Math.round(Math.random())}`;
  const user = await getUser(userId);

  if (!user) {
    return new NextResponse("Invalid user", { status: 403 });
  }

  // Create a session for the current user (access token auth), either with a provided user ID or a random one
  const session = liveblocks.prepareSession(userId, {
    userInfo: user.info,
  });

  // Use a naming pattern to allow access to rooms with a wildcard
  session.allow(`liveblocks:examples:*`, session.FULL_ACCESS);

  // Authorize the user and return the result
  const { status, body } = await session.authorize();
  return new NextResponse(body, { status });
}
