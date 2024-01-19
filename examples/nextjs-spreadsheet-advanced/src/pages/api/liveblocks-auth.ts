import { Liveblocks } from "@liveblocks/node";
import { NextApiRequest, NextApiResponse } from "next";
import { COLORS, NAMES } from "../../constants";

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY!;

const liveblocks = new Liveblocks({
  secret: API_KEY,
});

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  // We're generating random users and avatars here.
  // In a real-world scenario, this is where you'd assign the
  // user based on their real identity from your auth provider.
  // See https://liveblocks.io/docs/rooms/authentication for more information
  const userIndex = Math.floor(Math.random() * NAMES.length);

  const session = liveblocks.prepareSession(`user-${userIndex}`, {
    userInfo: {
      name: NAMES[userIndex],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      avatar: `https://liveblocks.io/avatars/avatar-${Math.floor(
        Math.random() * 30
      )}.png`,
    },
  });

  session.allow(req.body.room, session.FULL_ACCESS);

  const { status, body } = await session.authorize();
  return res.status(status).end(body);
}
