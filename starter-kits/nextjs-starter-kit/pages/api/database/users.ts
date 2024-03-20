import { NextApiRequest, NextApiResponse } from "next";
import { getUsers } from "../../../lib/server";

/**
 * GET Users
 *
 * Get users from your database
 *
 * @param req
 * @param req.query.userId - The users ids
 * @param req.query.search - The search term
 * @param res
 */
async function GET(req: NextApiRequest, res: NextApiResponse) {
  const userParam = req.query.userId;
  const searchParam = req.query.search;

  const userIds: string[] | undefined = Array.isArray(userParam)
    ? userParam
    : userParam
    ? [userParam]
    : undefined;
  const search: string | undefined = Array.isArray(searchParam)
    ? searchParam[0]
    : searchParam;

  const users = await getUsers({ userIds, search });
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
