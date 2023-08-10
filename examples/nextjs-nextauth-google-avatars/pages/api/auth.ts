import { Liveblocks } from "@liveblocks/node";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "./auth/getServerSession";
import { User } from "../../types";

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY!;

const liveblocks = new Liveblocks({
  secret: API_KEY,
});

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res);

  const anonymousUser: User = {
    name: "Anonymous",
    email: "none",
    image: "N/A",
  };
  const { name, email, image } = session?.user ?? anonymousUser;

  // We're generating users and avatars here based off of Google SSO metadata.
  //This is where you assign the
  // user based on their real identity from your auth provider.
  // See https://liveblocks.io/docs/rooms/authentication for more information
  const liveblocksSession = liveblocks.prepareSession(`user-${email}`, {
    userInfo: {
      name: name,
      avatar: image,
    },
  });

  liveblocksSession.allow(req.body.room, liveblocksSession.FULL_ACCESS);

  const { status, body } = await liveblocksSession.authorize();
  return res.status(status).end(body);
}
