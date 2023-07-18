import { Liveblocks } from "@liveblocks/node";
import type { NextApiRequest, NextApiResponse } from "next";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  liveblocksBaseUrl: `https://${process.env.NEXT_PUBLIC_WORKERS_ENDPOINT}/`,
});

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY || !req.cookies.userId) {
    return res.status(403).end();
  }

  const session = liveblocks.prepareSession(req.cookies.userId);

  session.allow(req.body.room, session.FULL_ACCESS);

  const { status, body } = await session.authorize();

  return res.status(status).end(body);
}
