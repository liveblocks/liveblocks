import { nn } from "@liveblocks/core";
import { Liveblocks } from "@liveblocks/node";
import type { NextApiRequest, NextApiResponse } from "next";

import { randomUser } from "../_utils";

const SECRET_KEY = nn(
  process.env.LIVEBLOCKS_SECRET_KEY,
  "Please specify LIVEBLOCKS_SECRET_KEY env var"
);

const liveblocks = new Liveblocks({
  secret: SECRET_KEY,

  // @ts-expect-error - Hidden setting
  baseUrl: nn(
    process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
    "Please specify NEXT_PUBLIC_LIVEBLOCKS_BASE_URL env var"
  ),
});

export default async function accessTokenAuth(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  const user = randomUser();

  const session = liveblocks.prepareSession(
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
