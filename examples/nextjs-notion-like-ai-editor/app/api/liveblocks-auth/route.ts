import { Liveblocks } from "@liveblocks/node";
import { NextRequest } from "next/server";
import { getSession } from "../../example";

// Authenticating your Liveblocks application
// https://liveblocks.io/docs/authentication

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Get the current user's unique id and info from your database
  const user = await getSession(request);

  // Create a Liveblocks session for the current user
  // userInfo is made available in Liveblocks presence hooks, e.g. useOthers
  const session = liveblocks.prepareSession(`${user.id}`, {
    userInfo: user.info,
  });

  // Use a naming pattern to allow access to rooms with a wildcard
  session.allow(`liveblocks:examples:*`, session.FULL_ACCESS);

  // Authorize the user and return the result
  const { body, status } = await session.authorize();
  return new Response(body, { status });
}
