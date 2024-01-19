import { Liveblocks } from "@liveblocks/node";
import { NextApiRequest, NextApiResponse } from "next";

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY!;

const liveblocks = new Liveblocks({
  secret: API_KEY,
});

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  if (!API_KEY) {
    return res.status(403).end();
  }

  const session = liveblocks.prepareSession(
    `user-${Math.floor(Math.random() * 10)}`
  );

  session.allow(req.body.room, session.FULL_ACCESS);

  const { status, body } = await session.authorize();
  return res.status(status).end(body);
}
