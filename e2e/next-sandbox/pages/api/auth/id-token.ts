import { nn } from "@liveblocks/core";
import { Liveblocks } from "@liveblocks/node";
import type { NextApiRequest, NextApiResponse } from "next";

import { randomUser } from "../_utils";

const SECRET_KEY = process.env.LIVEBLOCKS_SECRET_KEY;
if (!SECRET_KEY) {
  throw new Error("Please specify LIVEBLOCKS_SECRET_KEY in env");
}

// Derive Liveblocks base URL value from the existing NEXT_PUBLIC_LIVEBLOCKS_SERVER envvar
const liveblocksBaseUrl = new URL(
  nn(
    process.env.NEXT_PUBLIC_LIVEBLOCKS_SERVER,
    "Missing env var: NEXT_PUBLIC_LIVEBLOCKS_SERVER"
  )
);
liveblocksBaseUrl.protocol = "https";
liveblocksBaseUrl.pathname = "/";

const liveblocks = new Liveblocks({
  secret: SECRET_KEY,

  // @ts-expect-error - Hidden setting
  liveblocksBaseUrl: liveblocksBaseUrl.toString(),
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
