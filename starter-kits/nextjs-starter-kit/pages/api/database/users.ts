import { NextApiRequest, NextApiResponse } from "next";
import { getUsers } from "../../../lib/server/database/getUsers";

/**
 * GET Users
 *
 * Get users from your database
 *
 * @param req
 * @param req.query.userId - The users ids
 * @param res
 */
async function GET(req: NextApiRequest, res: NextApiResponse) {
  const userParam = req.query.userId;

  if (!userParam) {
    return res.status(400).json({
      error: {
        code: 400,
        message: "Not Users Passed",
        suggestion: `Check that you passed users to getUser(s)`,
      },
    });
  }

  const userIds: string[] = Array.isArray(userParam)
    ? (userParam as string[])
    : [userParam as string];

  const users = await getUsers(userIds);
  return res.status(200).json(users);
}

export default async function users(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "GET":
      return await GET(req, res);

    default:
      return res.status(405).json({
        error: {
          code: 405,
          message: "Method Not Allowed",
          suggestion: "Only GET is available from this API",
        },
      });
  }
}
