import { Liveblocks } from "@liveblocks/node";
import { NextResponse } from "next/server";

import { auth } from "@/auth/manager";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 */
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST() {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const userSession = await auth();

  const user = userSession?.user.info ?? {
    id: "anonymous",
    name: "Anonymous",
    color: "#f3f3f3",
    picture: "https://liveblocks.io/avatars/avatar-0.png",
  };

  // Create a session for the current user (access token auth)
  const session = liveblocks.prepareSession(user.id, {
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
