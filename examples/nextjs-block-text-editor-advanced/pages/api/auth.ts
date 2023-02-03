import { authorize } from "@liveblocks/node";
import { NextApiRequest, NextApiResponse } from "next";

const API_KEY =
  "sk_dev_RqpANTCULVYnXiBErjcng8Q2UnemhqiUvYAfD8lqZ1N1oREmH5emW2WFum5cWc_C";

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  if (!API_KEY) {
    return res.status(403).end();
  }
  // We're generating random users and avatars here.
  // In a real-world scenario, this is where you'd assign the
  // user based on their real identity from your auth provider.
  // See https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
  const response = await authorize({
    room: req.body.room,
    secret: API_KEY,
    userId: `user-${Math.floor(Math.random() * NAMES.length)}`,
    userInfo: {
      name: NAMES[Math.floor(Math.random() * NAMES.length)],
      imageUrl: `https://liveblocks.io/avatars/avatar-${Math.floor(
        Math.random() * 30
      )}.png`,
    },
  });
  return res.status(response.status).end(response.body);
}

const NAMES = [
  "Charlie Layne",
  "Mislav Abha",
  "Tatum Paolo",
  "Anjali Wanda",
  "Jody Hekla",
  "Emil Joyce",
  "Jory Quispe",
  "Quinn Elton",
];
