import { authorize } from "@liveblocks/node";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "./auth/getServerSession";
import { User } from "../../src/types";

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  if (!API_KEY) {
    return res.status(403).end();
  }

  const session = await getServerSession(req, res);
  // Anonymous user info
  const anonymousUser: User = {
    name: "Anonymous",
    email: "none",
    image: "N/A",
  };
  // console.log("session: ", session);
  const { name, email, image } = session?.user ?? anonymousUser;

  // We're generating users and avatars here based off of Google SSO metadata.
  //This is where you assign the
  // user based on their real identity from your auth provider.
  // See https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
  const response = await authorize({
    room: req.body.room,
    secret: API_KEY,
    userId: `user-${email}`,
    userInfo: {
      name: name,
      imageUrl: image,
    },
  });
  return res.status(response.status).end(response.body);
}
