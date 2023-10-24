import { nn } from "@liveblocks/core";
import { authorize } from "@liveblocks/node";
import type { NextApiRequest, NextApiResponse } from "next";

import { randomUser } from "../_utils";

const SECRET_KEY = nn(
  process.env.LIVEBLOCKS_SECRET_KEY,
  "Please specify LIVEBLOCKS_SECRET_KEY env var"
);

export default async function legacyAuth(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const room = (req.body as { room: string }).room;
  const user = randomUser();

  const response = await authorize({
    room,
    userId: `user-${user.id}`,
    userInfo: {
      name: user.name,
      issuedBy: "/api/auth/legacy-token",
    },
    secret: SECRET_KEY,

    // @ts-expect-error - Hidden setting
    baseUrl: nn(
      process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
      "Please specify NEXT_PUBLIC_LIVEBLOCKS_BASE_URL env var"
    ),
  });
  return res.status(response.status).end(response.body);
}
