import { NextApiRequest, NextApiResponse } from "next";
import {
  authorize,
  getDraftsGroupName,
  getServerSession,
} from "../../../lib/server";
import { User } from "../../../types";

/**
 * PREVIOUS AUTH - Used in /liveblocks.config.ts
 *
 * Authorize your Liveblocks session. Get info about the current user
 * from NextAuth, pass it to Liveblocks, and connect to the room.
 *
 * @param req
 * @param req.body.roomId - The id of the current room
 * @param res
 */
export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  const { roomId } = req.body;

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

  // Get Liveblocks access token
  const { data, error } = await authorize({
    roomId: roomId,
    userId: id,
    userInfo: { name, color, avatar },
    groupIds: groupIdsWithDraftsGroup,
  });

  if (error) {
    return res.status(401).json({
      error: {
        code: 401,
        message: "No access",
        suggestion: "You don't have access to this Liveblocks room",
      },
    });
  }

  if (!data) {
    return res.status(404).json({
      error: {
        code: 404,
        message: "Access token issue",
        suggestion: "Contact an administrator",
      },
    });
  }

  // Token retrieved successfully
  return res.status(200).json(data);
}
