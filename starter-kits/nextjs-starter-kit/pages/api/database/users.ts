import { NextApiRequest, NextApiResponse } from "next";
import { getUser } from "../../../lib/server";

/**
 * GET User
 *
 * Get a user from your database
 *
 * @param req
 * @param req.query.userId - The user's id
 * @param res
 */
async function GET(req: NextApiRequest, res: NextApiResponse) {
  const userId = req.query.userId as string;
  const user = await getUser(decodeURIComponent(userId));

  if (!user) {
    return res.status(400).json({
      error: {
        code: 400,
        message: "User Not Found",
        suggestion: `Check that the user "${userId}" exists in the system`,
      },
    });
  }

  return res.status(200).json(user);
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
