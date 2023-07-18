import { Liveblocks } from "@liveblocks/node";
import type { NextApiRequest, NextApiResponse } from "next";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  liveblocksBaseUrl: `https://${process.env.NEXT_PUBLIC_WORKERS_ENDPOINT}/`,
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

export const NAMES = [
  "Charlie Layne",
  "Mislav Abha",
  "Tatum Paolo",
  "Anjali Wanda",
  "Jody Hekla",
  "Emil Joyce",
  "Jory Quispe",
  "Quinn Elton",
];
