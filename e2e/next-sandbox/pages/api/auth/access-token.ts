import { Liveblocks } from "@liveblocks/node";
import type { NextApiRequest, NextApiResponse } from "next";

import { randomUser } from "../_utils";

const SECRET_KEY = process.env.LIVEBLOCKS_SECRET_KEY;
if (!SECRET_KEY) {
  throw new Error("Please specify LIVEBLOCKS_SECRET_KEY in env");
}
const LIVEBLOCKS_BASE_URL = process.env.LIVEBLOCKS_BASE_URL;

const liveblocks = new Liveblocks({
  secret: SECRET_KEY,

  // @ts-expect-error - Hidden setting
  liveblocksBaseUrl: LIVEBLOCKS_BASE_URL,
});

export default async function accessTokenAuth(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  const user = randomUser();

  const session = await liveblocks.prepareSession(
    // Unique user ID
    `user-${user.id}`,
    {
      userInfo: {
        name: user.name,
        issuedBy: "/api/auth/access-token",
      },
    }
  );
  session.allow("e2e*", session.FULL_ACCESS);
  const response = await session.authorize();
  return res.status(response.status).end(response.body);
}
