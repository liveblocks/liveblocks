import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { AI_USER_ID, getUser, getUsers } from "@/app/database";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 *
 * The "login" in this example is fake: the client tells us which demo user
 * it wants to be, and we hand out a session for that user. Do not do this
 * in production.
 */

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY,
  });

  const { userId } = (await request.json().catch(() => ({}))) as {
    userId?: string;
  };

  // The AI teammate never logs in; it only posts through `@liveblocks/node`.
  const user =
    userId && userId !== AI_USER_ID ? getUser(userId) : getUsers()[0];

  if (!user) {
    return new NextResponse("User not found", { status: 403 });
  }

  const session = liveblocks.prepareSession(`${user.id}`, {
    userInfo: user.info,
  });

  // Use a naming pattern to allow access to rooms with a wildcard
  session.allow(`liveblocks:examples:*`, ["*:write"]);

  const { status, body } = await session.authorize();
  return new NextResponse(body, { status });
}
