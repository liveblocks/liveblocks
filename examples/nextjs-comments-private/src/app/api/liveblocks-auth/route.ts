import { Liveblocks } from "@liveblocks/node";
import { getRandomUser } from "@/database";
import { NextRequest, NextResponse } from "next/server";
import { EXTERNAL_USER_TYPE, getUserType } from "@/user";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 */

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
});

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const userType = getUserType(request.nextUrl.searchParams);

  // Get the current user's unique id and info from your database
  const user = getRandomUser();

  // Create a session for the current user (access token auth)
  // userInfo is made available in Liveblocks user hooks, e.g. useSelf
  const session = liveblocks.prepareSession(user.id, {
    userInfo: user.info,
  });

  // Use a naming pattern to allow access to rooms with a wildcard
  session.allow(
    `liveblocks:examples:*`,
    // External users don't have access to private comments
    userType === EXTERNAL_USER_TYPE
      ? ["*:write", "comments:private:none"]
      : ["*:write"]
  );

  // Authorize the user and return the result
  const { status, body } = await session.authorize();
  return new NextResponse(body, { status });
}
