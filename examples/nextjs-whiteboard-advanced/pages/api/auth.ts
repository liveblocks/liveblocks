import { authorize } from "@liveblocks/node";
import { NextApiRequest, NextApiResponse } from "next";

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;

let n = 0;

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  if (!API_KEY) {
    return res.status(401).end();
  }

  const room = req.body.room;

  // Simulate infrastructure issues: for every 10 requests, the 5 first ones
  // made will fail
  if (n++ % 10 < 5) {
    return res.status(502).end();
  }

  const response = await authorize({
    secret: API_KEY,
    room,
    userId: `user-${Math.floor(Math.random() * 10)}`,
  });

  return res.status(response.status).end(response.body);
}
