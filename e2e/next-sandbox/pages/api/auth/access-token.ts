import type { NextApiRequest, NextApiResponse } from "next";
import { randomUser } from "../_utils";
import { Liveblocks } from "@liveblocks/node";

const SECRET_KEY = process.env.LIVEBLOCKS_SECRET_KEY;
if (!SECRET_KEY) {
  throw new Error("Please specify LIVEBLOCKS_SECRET_KEY in env");
}
const LIVEBLOCKS_AUTHORIZE_ENDPOINT = process.env.LIVEBLOCKS_AUTHORIZE_ENDPOINT;
const secret = SECRET_KEY;

const liveblocks = new Liveblocks({
  secret,

  // @ts-expect-error - Hidden setting
  liveblocksAuthorizeEndpoint: LIVEBLOCKS_AUTHORIZE_ENDPOINT,
});

export default async function accessTokenAuth(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  const user = randomUser();

  const session = await liveblocks.prepareSession(
    // Unique user ID
    `user-${user.id}`,
    { userInfo: { name: user.name } }
  );
  session.allow("e2e-*", session.FULL_ACCESS);
  const response = await session.authorize();
  return res.status(response.status).end(response.body);
}
