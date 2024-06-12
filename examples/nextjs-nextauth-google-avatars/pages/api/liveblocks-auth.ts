import { Liveblocks } from "@liveblocks/node";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "./auth/getServerSession";
import { User } from "../../types";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 */

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
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
  const liveblocksSession = liveblocks.prepareSession(`user-${email}`, {
    userInfo: {
      name: name,
      avatar: image,
    },
  });

  // Use a naming pattern to allow access to rooms with a wildcard
  liveblocksSession.allow(
    `liveblocks:examples:*`,
    liveblocksSession.FULL_ACCESS
  );

  const { status, body } = await liveblocksSession.authorize();
  res.status(status).end(body);
}
