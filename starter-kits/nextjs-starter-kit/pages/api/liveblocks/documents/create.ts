import { NextApiRequest, NextApiResponse } from "next";
import { createDocument } from "../../../../lib/server";
import { CreateDocumentRequest } from "../../../../types";

/**
 * POST Create - Used in /lib/client/createDocument.ts
 *
 * Create a new Liveblocks room. Pass creation info in JSON body.
 * Only allow if authorized with NextAuth.
 *
 * @param req
 * @param req.body - JSON string, as defined below
 * @param req.body.name - The name of the new document
 * @param req.body.type - The type of document e.g. "canvas",
 * @param req.body.userId - The creator of the document
 * @param [req.body.groupIds] - Optional, limit access to room to just these groups
 * @param [req.body.draft] - Optional, if the document is a draft
 * @param res
 */
async function POST(req: NextApiRequest, res: NextApiResponse) {
  const { name, type, userId, groupIds, draft }: CreateDocumentRequest =
    JSON.parse(req.body);

  const { data, error } = await createDocument(req, res, {
    name: name,
    type: type,
    userId: userId,
    groupIds: groupIds ? groupIds.split(",") : undefined,
    draft: draft,
  });

  if (error) {
    return res.status(error.code ?? 500).json({ error });
  }

  return res.status(200).json(data);
}

export default async function create(
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
