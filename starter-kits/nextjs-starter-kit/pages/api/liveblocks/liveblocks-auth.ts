import { NextApiRequest, NextApiResponse } from "next";
import { getDraftsGroupName, getServerSession } from "../../../lib/server";
import { User } from "../../../types";
import { Liveblocks } from "@liveblocks/node";
import { SECRET_API_KEY } from "../../../liveblocks.server.config";

const liveblocks = new Liveblocks({
  secret: SECRET_API_KEY as string,
});

/**
 * AUTH - Used in /liveblocks.config.ts
 *
 * Authorize your Liveblocks session with ID tokens. Get info about the current
 * user from NextAuth, pass it to Liveblocks, and connect to the room.
 *
 * @param req
 * @param req.body.roomId - The id of the current room
 * @param res
 */
export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  // Get current session from NextAuth
  const session = await getServerSession(req, res);

  // Anonymous user info
  const anonymousUser: User = {
    id: "anonymous",
    name: "Anonymous",
    color: "red",
    groupIds: [],
  };

  // Get current user info from session (defined in /pages/api/auth/[...nextauth].ts)
  // If no session found, this is a logged out/anonymous user
  const {
    name,
    avatar,
    color,
    id,
    groupIds = [],
  } = session?.user.info ?? anonymousUser;

  const groupIdsWithDraftsGroup = [...groupIds, getDraftsGroupName(id)];

  // Get Liveblocks ID token
  const { status, body } = await liveblocks.identifyUser(
    {
      userId: id,
      groupIds: groupIdsWithDraftsGroup,
    },
    {
      userInfo: { name, color, avatar },
    }
  );

  if (status !== 200) {
    return res.status(401).json({
      error: {
        code: 401,
        message: "No access",
        suggestion: "You don't have access to this Liveblocks room",
      },
    });
  }

  if (!body) {
    return res.status(404).json({
      error: {
        code: 404,
        message: "ID token issue",
        suggestion: "Contact an administrator",
      },
    });
  }

  // Token retrieved successfully
  return res.status(200).end(body);
}
