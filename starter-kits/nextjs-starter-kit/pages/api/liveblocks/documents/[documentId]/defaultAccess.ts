import { NextApiRequest, NextApiResponse } from "next";
import { updateDefaultAccess } from "../../../../../lib/server";
import { UpdateDocumentScope } from "../../../../../types";

/**
 * POST Default access - used in /lib/client/updateDocumentScope.ts
 *
 * Update the default access for a document to public or private
 *
 * @param req
 * @param req.query.documentId - The document's id
 * @param req.body - JSON string, as defined below
 * @param req.body.access - The new default access: "public" or "private"
 * @param res
 */
async function POST(req: NextApiRequest, res: NextApiResponse) {
  const documentId = req.query.documentId as string;
  const { access }: UpdateDocumentScope = JSON.parse(req.body);

  const { data, error } = await updateDefaultAccess(req, res, {
    documentId,
    access,
  });

  if (error) {
    return res.status(error.code ?? 500).json({ error });
  }

  return res.status(200).json(data);
}

export default async function defaultAccess(
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
