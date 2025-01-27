import { Liveblocks } from "@liveblocks/node";
import { NextResponse } from "next/server";

import { auth } from "@/auth/manager";
import { getUser } from "@/lib/database";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 */

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  // XXX
  // @ts-expect-error
  baseUrl: "https://dev.dev-liveblocks5948.workers.dev/",
});

export async function POST() {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const userSession = await auth();
  if (!userSession) {
    return new NextResponse("no authenticated user", { status: 403 });
  }

  const userId = userSession.user.info.id;
  const user = getUser(userId);

  if (!user) {
    return new NextResponse(`no user found in db for id '${userId}'`, {
      status: 404,
    });
  }

  // Create a session for the current user (access token auth)
  const session = liveblocks.prepareSession(userId, {
    userInfo: { name: user.name, color: user.color, picture: user.picture },
  });

  // Use a naming pattern to allow access to rooms with a wildcard
  session.allow(
    `liveblocks:notifications-settings-examples:*`,
    session.FULL_ACCESS
  );

  // Authorize the user and return the result
  const { status, body } = await session.authorize();

  return new NextResponse(body, { status });
}
