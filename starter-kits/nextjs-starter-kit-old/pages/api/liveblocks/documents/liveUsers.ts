import { NextApiRequest, NextApiResponse } from "next";
import { getLiveUsers } from "../../../../lib/server";

/**
 * POST Live Users - Used in /lib/client/getLiveUsers.ts
 *
 * Retrieve the current live users in rooms
 * Select rooms by posting an array of room names in the body
 * Only allow if authorized with NextAuth
 *
 * @param req
 * @param req.body - JSON string, as defined below
 * @param req.body.roomIds - A list of room ids to select
 * @param res
 */
async function POST(req: NextApiRequest, res: NextApiResponse) {
  const documentIds: string[] = JSON.parse(req.body);

  const { data, error } = await getLiveUsers(req, res, {
    documentIds,
  });

  if (error) {
    return res.status(error.code ?? 500).json({ error });
  }

  return res.status(200).json(data);
}

export default async function liveUsers(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "POST":
      return await POST(req, res);

    default:
      return res.status(405).json({
        error: {
          code: 405,
          message: "Method Not Allowed",
          suggestion: "Only POST is available from this API",
        },
      });
  }
}
