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
  baseUrl: nn(
    process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
    "Please specify NEXT_PUBLIC_LIVEBLOCKS_BASE_URL env var"
  ),
});

export default async function idTokenBasedAuth(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  const user = randomUser();
  const response = await liveblocks.identifyUser(`user-${user.id}`, {
    userInfo: {
      name: user.name,
      issuedBy: "/api/auth/id-token",
    },
  });
  res.status(response.status).end(response.body);
}
