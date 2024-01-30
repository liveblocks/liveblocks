import { NextApiRequest, NextApiResponse } from "next";
import {
  getDocumentUsers,
  removeUserAccess,
  updateUserAccess,
} from "../../../../../lib/server";
import { RemoveUserRequest, UpdateUserRequest } from "../../../../../types";

/**
 * GET Users - Used in /lib/client/getDocumentUsers.ts
 *
 * Get all collaborators in a given document.
 * Only allow if authorized with NextAuth and user has access to room.
 *
 * @param req
 * @param req.query.documentId - The document's id
 * @param res
 */
async function GET(req: NextApiRequest, res: NextApiResponse) {
  const documentId = req.query.documentId as string;

  const { data, error } = await getDocumentUsers(req, res, {
    documentId,
  });

  if (error) {
    return res.status(error.code ?? 500).json({ error });
  }

  return res.status(200).json(data);
}

/**
 * POST Users - User in /lib/client/updateUserAccess.ts
 *
 * Add a new collaborator to a document, or edit an old collaborator
 * Only allow if authorized with NextAuth and is added as a userId on usersAccesses
 * Do not allow if public access, or access granted through groupIds
 *
 * @param req
 * @param req.query.documentId - The document's id
 * @param req.body - JSON string, as defined below
 * @param req.body.userId - The id of the user we're updating
 * @param req.body.access - The user's new document access level
 * @param res
 */
async function POST(req: NextApiRequest, res: NextApiResponse) {
  const documentId = req.query.documentId as string;
  const { userId, access }: UpdateUserRequest = JSON.parse(req.body);

  const { data, error } = await updateUserAccess(req, res, {
    documentId,
    userId,
    access,
  });

  if (error) {
    return res.status(error.code ?? 500).json({ error });
  }

  return res.status(200).json(data);
}

/**
 * PATCH Users - Used in /lib/client/removeUserAccess.ts
 *
 * Remove a collaborator from a document
 * Only allow if authorized with NextAuth and is added as a userId on usersAccesses
 * Do not allow if public access, or access granted through groupIds
 *
 * @param req
 * @param req.query.documentId - The document's id
 * @param req.body - JSON string, as defined below
 * @param req.body.userId - The removed user's id
 * @param res
 */
async function PATCH(req: NextApiRequest, res: NextApiResponse) {
  const documentId = req.query.documentId as string;
  const { userId }: RemoveUserRequest = JSON.parse(req.body);

  const { data, error } = await removeUserAccess(req, res, {
    documentId,
    userId,
  });

  if (error) {
    return res.status(error.code ?? 500).json({ error });
  }

  return res.status(200).json(data);
}

export default async function users(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "GET":
      return await GET(req, res);
    case "POST":
      return await POST(req, res);
    case "PATCH":
      return await PATCH(req, res);
    default:
      return res.status(405).json({
        error: {
          code: 405,
          message: "Method Not Allowed",
          suggestion: "Only GET, POST, and PATCH are available from this API",
        },
      });
  }
}
