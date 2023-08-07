import { Liveblocks } from "@liveblocks/node";
import type { NextApiRequest, NextApiResponse } from "next";
import { NAMES } from "../../database";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return res.status(403).end();
  }

  const userIndex = Math.floor(Math.random() * NAMES.length);
  const session = liveblocks.prepareSession(`user-${userIndex}`);

  session.allow(req.body.room, session.FULL_ACCESS);

  const { status, body } = await session.authorize();

  return res.status(status).end(body);
}
