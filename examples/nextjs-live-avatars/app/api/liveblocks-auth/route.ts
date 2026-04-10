import { Liveblocks } from "@liveblocks/node";
import { NextRequest } from "next/server";

import { getRandomUser, getUser } from "../../../database";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 */

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const userId = body.userId as string | undefined;
  const user = userId ? getUser(userId) : getRandomUser();

  if (!user) {
    return new Response(null, { status: 401 });
  }

  const session = liveblocks.prepareSession(user.id, {
    userInfo: user.info,
  });

  session.allow(`liveblocks:examples:*`, session.FULL_ACCESS);

  const { status, body: responseBody } = await session.authorize();
  return new Response(responseBody, { status });
}
