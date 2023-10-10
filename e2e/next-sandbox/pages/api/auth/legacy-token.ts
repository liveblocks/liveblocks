import { authorize } from "@liveblocks/node";
import type { NextApiRequest, NextApiResponse } from "next";

import { randomUser } from "../_utils";

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;
const LIVEBLOCKS_AUTHORIZE_ENDPOINT = process.env.LIVEBLOCKS_AUTHORIZE_ENDPOINT;

export default async function legacyAuth(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!API_KEY) {
    return res.status(403).end();
  }

  const room = (req.body as { room: string }).room;
  const user = randomUser();

  const response = await authorize({
    room,
    userId: `user-${user.id}`,
    userInfo: {
      name: user.name,
      issuedBy: "/api/auth/legacy-token",
    },
    secret: API_KEY,

    // @ts-expect-error - Hidden setting
    liveblocksAuthorizeEndpoint: LIVEBLOCKS_AUTHORIZE_ENDPOINT,
  });
  return res.status(response.status).end(response.body);
}
