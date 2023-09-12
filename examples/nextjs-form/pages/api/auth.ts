import { Liveblocks } from "@liveblocks/node";
import { NextApiRequest, NextApiResponse } from "next";
import { NAMES } from "../../constants";

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY!;

const liveblocks = new Liveblocks({ secret: API_KEY });

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  // For the avatar example, we're generating random users
  // and set their info from the authentication endpoint
  // See https://liveblocks.io/docs/rooms/authentication for more information
  const userIndex = Math.floor(Math.random() * NAMES.length);

  const session = liveblocks.prepareSession(`user-${userIndex}`, {
    userInfo: {
      name: NAMES[userIndex],
      avatar: `https://liveblocks.io/avatars/avatar-${Math.floor(
        Math.random() * 30
      )}.png`,
    },
  });
  session.allow(req.body.room, session.FULL_ACCESS);

  const { status, body } = await session.authorize();
  return res.status(status).end(body);
}
