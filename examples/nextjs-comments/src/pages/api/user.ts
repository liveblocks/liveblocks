import type { NextApiRequest, NextApiResponse } from "next";
import { NAMES } from "../../constants";

type UserApiRequest = NextApiRequest & {
  query: {
    userId?: string;
  };
};

export default async function user(req: UserApiRequest, res: NextApiResponse) {
  const {
    query: { userId },
  } = req;

  if (!userId || !userId.startsWith("user-")) {
    return res.status(400).end();
  }

  const userIndex = Number(userId.replace(/^\D+/g, "")) ?? 0;

  return res.json({
    name: NAMES[userIndex],
    avatar: `https://liveblocks.io/avatars/avatar-${userIndex}.png`,
  });
}
