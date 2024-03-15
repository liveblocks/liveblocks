import { Liveblocks } from "@liveblocks/node";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 */

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  // Create a session for the current user (access token auth)
  const session = liveblocks.prepareSession(
    `user-${Math.floor(Math.random() * 10)}`
  );

  // Use a naming pattern to allow access to rooms with a wildcard
  session.allow(`liveblocks:examples:*`, session.FULL_ACCESS);

  const { status, body } = await session.authorize();
  res.status(status).end(body);
}
