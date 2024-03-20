import { NextApiRequest, NextApiResponse } from "next";
import { DRAFTS_PREFIX, getGroup } from "../../../lib/server";

/**
 * GET Groups
 *
 * Get groups from your database
 *
 * @param req
 * @param req.query.groupId - The group's or groups' id(s)
 * @param res
 */
async function GET(req: NextApiRequest, res: NextApiResponse) {
  const groupParam = req.query.groupId;

  if (Array.isArray(groupParam)) {
    const groupIds = await Promise.all(
      groupParam.map((groupId) => getGroup(decodeURIComponent(groupId)))
    );

    return res.status(200).json(
      // Filter draft groups or any groups that didn't return
      groupIds.filter((group) => group)
    );
  } else {
    const groupId = decodeURIComponent(groupParam as string);

    // If this is a draft group, ignore and return empty array
    if (groupId.startsWith(DRAFTS_PREFIX)) {
      return res.status(200).json([]);
    }

    const group = await getGroup(groupId);

    if (!group) {
      return res.status(400).json({
        error: {
          code: 400,
          message: "Group Not Found",
          suggestion: `Check that the user "${groupId}" exists in the system`,
        },
      });
    }

    return res.status(200).json([group]);
  }
}

export default async function groups(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
