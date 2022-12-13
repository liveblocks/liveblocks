import { NextApiRequest, NextApiResponse } from "next";
import {
  deleteDocument,
  getDocument,
  updateDocument,
} from "../../../../../lib/server";
import { UpdateDocumentRequest } from "../../../../../types";

/**
 * GET Document - Used in /lib/client/getDocument.ts
 *
 * Get a document.
 * Only allow if user has access to room (including logged-out users and public rooms).
 *
 * @param req
 * @param req.query.documentId - The document's id
 * @param res
 */
async function GET(req: NextApiRequest, res: NextApiResponse) {
  const documentId = req.query.documentId as string;

  const { data, error } = await getDocument(req, res, {
    documentId,
  });

  if (error) {
    return res.status(error.code ?? 500).json({ error });
  }

  return res.status(200).json(data);
}

/**
 * POST Document - Used in /lib/client/updateDocumentName.ts
 *
 * Update a document with new data
 * Only allow if user has access to room (including logged-out users and public rooms).
 * Do not allow if public access, or access granted through groupIds
 *
 * @param req
 * @param req.query.documentId - The document's id
 * @param req.body - JSON string, as defined below
 * @param req.body.documentData - Contains any properties to update, taken from a Document object
 * @param res
 */
async function POST(req: NextApiRequest, res: NextApiResponse) {
  const documentId = req.query.documentId as string;
  const { documentData }: UpdateDocumentRequest = JSON.parse(req.body);

  const { data, error } = await updateDocument(req, res, {
    documentId,
    documentData,
  });

  if (error) {
    return res.status(error.code ?? 500).json({ error });
  }

  return res.status(200).json(data);
}

/**
 * DELETE Document - Used in /lib/client/deleteDocument.ts
 *
 * Delete a document
 * Only allow if authorized with NextAuth and is added as a userId on usersAccesses
 * Do not allow if public access, or access granted through groupIds
 *
 * @param req
 * @param req.query.documentId - The document's id
 * @param res
 */
async function DELETE(req: NextApiRequest, res: NextApiResponse) {
  const documentId = req.query.documentId as string;

  const { data, error } = await deleteDocument(req, res, {
    documentId,
  });

  if (error) {
    return res.status(error.code ?? 500).json({ error });
  }

  return res.status(200).json(data);
}

export default async function document(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      return await GET(req, res);
    case "POST":
      return await POST(req, res);
    case "DELETE":
      return await DELETE(req, res);

    default:
      return res.status(405).json({
        error: {
          code: 405,
          message: "Method Not Allowed",
          suggestion: "Only GET, POST, and DELETE are available from this API",
        },
      });
  }
}
