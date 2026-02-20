import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";

const USERS = [
  {
    id: "user-0",
    info: {
      name: "Charlie Layne",
      avatar: "https://liveblocks.io/avatars/avatar-0.png",
    },
  },
];

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 */

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL!,
});

export async function POST(_request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  // Get a random user from the database (for demo purposes)
  const user = USERS[Math.floor(Math.random() * USERS.length)];

  // Create a session for the current user (access token auth)
  const session = liveblocks.prepareSession(`${user.id}`, {
    userInfo: user.info,
  });

  // Use a naming pattern to allow access to rooms with a wildcard
  session.allow(`liveblocks:examples:*`, session.FULL_ACCESS);

  // Authorize the user and return the result
  const { status, body } = await session.authorize();

  return new NextResponse(body, { status });
}
