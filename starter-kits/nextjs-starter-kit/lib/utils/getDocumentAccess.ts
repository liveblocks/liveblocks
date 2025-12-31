import { Document, DocumentAccess, User } from "@/types";

interface Props {
  documentAccesses: Document["accesses"];
  userId: User["id"];
}

const accessLevelHierarchy = [
  DocumentAccess.NONE,
  DocumentAccess.READONLY,
  DocumentAccess.EDIT,
  DocumentAccess.FULL,
];

export function getDocumentAccess({ documentAccesses, userId }: Props) {
  let accessLevel = documentAccesses.default;

  let userAccess = documentAccesses.users[userId];

  // If EDIT access set at user level, give FULL access
  if (userAccess === DocumentAccess.EDIT) {
    userAccess = DocumentAccess.FULL;
  }

  // If a user id is higher than default access, use this
  if (
    accessLevelHierarchy.indexOf(userAccess) >
    accessLevelHierarchy.indexOf(accessLevel)
  ) {
    accessLevel = userAccess;
  }

  return accessLevel;
}
