import { Document, DocumentPermissionType, User } from "@/types";

interface Props {
  document: Document;
  userId: User["id"];
}

/**
 * Get the user's permission type for a document. Not secure, used for UI purposes only.
 * Checks user-specific access first, then falls back to default access based on permission group
 */
export function getDocumentAccess({
  document,
  userId,
}: Props): DocumentPermissionType {
  // If user is the owner they have write access
  if (document.owner === userId) {
    return "write";
  }

  // Check if user has specific permission for this document
  const userPermission = document.userPermissions[userId];
  if (userPermission) {
    return userPermission;
  }

  // Otherwise, return the document's permission type
  return document.generalPermissions.type;
}
