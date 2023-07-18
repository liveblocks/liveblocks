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
  return res.status(response.status).end(response.body);
}
