import { authorize } from "@liveblocks/node";
import { NextApiRequest, NextApiResponse } from "next";
import users from "../../users";

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  if (!API_KEY) {
    return res.status(403).end();
  }

  // See https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
  const response = await authorize({
    room: req.body.room,
    secret: API_KEY,
    userId: `id-${Math.floor(Math.random() * Object.keys(users).length)}`,
  });
  return res.status(response.status).end(response.body);
}
