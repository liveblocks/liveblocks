import { NextApiRequest, NextApiResponse } from "next";
import { getDocuments } from "../../../../lib/server";
import { DocumentType } from "../../../../types";

/**
 * GET Documents
 *
 * Get a list of documents.
 * Filter by sending userId, groupIds, or metadata in the query, otherwise return all.
 * Only allow if authorized with NextAuth and user has access to each room.
 *
 * @param req
 * @param [req.query.userId] - Optional, filter to rooms with this userAccess set
 * @param [req.query.groupIds] - Optional, filter to rooms with these groupIds set (comma separated)
 * @param [req.query.documentType] - Optional, filter for this type of document e.g. "canvas"
 * @param [req.query.drafts] - Optional, retrieve only draft documents
 * @param [req.query.limit] - Optional, the amount of documents to retrieve
 * @param res
 */
async function GET(req: NextApiRequest, res: NextApiResponse) {
  const userId = (req.query.userId as string) ?? undefined;
  const groupIds = (req.query.groupIds as string) ?? undefined;
  const documentType = (req.query.documentType as DocumentType) ?? undefined;
  const drafts = !!req.query.drafts;
  const limit = parseInt(req.query.limit as string);

  const groupIdsArray = groupIds ? groupIds.split(",") : [];

  const { data, error } = await getDocuments(req, res, {
    userId: userId,
    groupIds: groupIdsArray,
    documentType: documentType,
    drafts: drafts,
    limit: limit,
  });

  if (error) {
    return res.status(error.code ?? 500).json({ error });
  }

  return res.status(200).json(data);
}

export default async function documents(
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
