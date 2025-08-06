import { Liveblocks } from "@liveblocks/node";
import { NextRequest } from "next/server";
import { getUsers } from "@/database";

// Authenticating your Liveblocks application
// https://liveblocks.io/docs/authentication

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function POST(request: NextRequest) {
  // Always use the first user for consistent authentication
  const user = getUsers()[0];

  // Create a session for the current user
  // userInfo is made available in Liveblocks presence hooks, e.g. useOthers
  const session = liveblocks.prepareSession(`${user.id}`, {
    userInfo: user.info,
  });
  session.allow(`*`, session.FULL_ACCESS);

  // Authorize the user and return the result
  const { body, status } = await session.authorize();
  return new Response(body, { status });
}
