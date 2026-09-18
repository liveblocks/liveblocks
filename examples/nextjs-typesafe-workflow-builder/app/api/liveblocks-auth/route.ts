import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { getRandomUser, getUser } from "../../database";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/api-reference/authentication
 */

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  // LIVEBLOCKS_BASE_URL is only set when running against the local Liveblocks dev server.
  baseUrl: process.env.LIVEBLOCKS_BASE_URL,
});

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const body = (await request.json()) as {
    room?: string;
    userId?: string;
  };

  const user =
    (body.userId ? getUser(body.userId) : undefined) ?? getRandomUser();

  const session = liveblocks.prepareSession(user.id, {
    userInfo: user.info,
  });

  session.allow("liveblocks:examples:*", ["*:write"]);

  const { status, body: responseBody } = await session.authorize();

  return new NextResponse(responseBody, { status });
}
