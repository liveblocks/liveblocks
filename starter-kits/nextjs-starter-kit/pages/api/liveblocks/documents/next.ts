import { NextApiRequest, NextApiResponse } from "next";
import { getNextDocuments } from "../../../../lib/server";

/**
 * GET Next - used in /lib/client/getNextDocuments.ts
 *
 * Get the next rooms from the next param
 * The `next` param is retrieved from /pages/api/documents/index.ts
 * That API is called on the client within /lib/client/getDocumentsByGroup.ts
 * Only allow if authorized with NextAuth and user has access to each room.
 *
 * @param req
 * @param req.query.nextPage - String containing a URL to get the next set of rooms, returned from Liveblocks API
 * @param res
 */
async function GET(req: NextApiRequest, res: NextApiResponse) {
  const nextPage = req.query.nextPage as string;

  const { data, error } = await getNextDocuments(req, res, {
    nextPage,
  });

  if (error) {
    return res.status(error.code ?? 500).json({ error });
  }

  return res.status(200).json(data);
}

export default async function next(req: NextApiRequest, res: NextApiResponse) {
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
