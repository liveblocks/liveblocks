import { authorize } from "@liveblocks/node";
import { NextApiRequest, NextApiResponse } from "next";

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;

/*
  If you are using the public key, you don't need this endpoint.
  The Liveblocks client will use Liveblocks public authentification endpoint.
  The use of the secret key and this endpoint is needed for the live-avatars demo. 
*/
export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  if (!API_KEY) {
    return res.status(403).end();
  }

  const room = req.body.room;

  // For the avatar example, we're generating random users
  // and set their info from the authentication endpoint
  // See https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
  if (room === "example-live-avatars") {
    const response = await authorize({
      room,
      secret: API_KEY,
      userInfo: {
        name: NAMES[Math.floor(Math.random() * NAMES.length)],
        picture: `/assets/avatars/${Math.floor(Math.random() * 10)}.png`,
      },
    });
    return res.status(response.status).end(response.body);
  }

  const response = await authorize({
    room,
    secret: API_KEY,
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
