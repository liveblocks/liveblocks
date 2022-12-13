import {
  Document,
  DocumentAccess,
  DocumentGroup,
  DocumentType,
  DocumentUser,
} from "./document";

/**
 * These types are the properties used in:
 * `/lib/client/documents/`
 * `/lib/server/documents/`
 */

export type CreateDocumentProps = {
  name: Document["name"];
  type: DocumentType;
  userId: DocumentUser["id"];
  groupIds?: DocumentGroup["id"][];
  draft?: boolean;
};

export type GetDocumentProps = {
  documentId: Document["id"];
};

export type UpdateDocumentProps = {
  documentId: Document["id"];
  documentData: Record<string, any>;
};

export type UpdateDefaultAccessProps = {
  documentId: Document["id"];
  access: DocumentAccess;
};

export type GetDocumentGroupsProps = {
  documentId: Document["id"];
};

export type UpdateGroupAccessProps = {
  groupId: DocumentGroup["id"];
  documentId: Document["id"];
  access: DocumentAccess;
};

export type RemoveGroupAccessProps = {
  groupId: DocumentGroup["id"];
  documentId: Document["id"];
};

export type GetDocumentUsersProps = {
  documentId: Document["id"];
};

export type UpdateUserAccessProps = {
  userId: DocumentUser["id"];
  documentId: Document["id"];
  access: DocumentAccess;
};

export type RemoveUserAccessProps = {
  userId: DocumentUser["id"];
  documentId: Document["id"];
};

export type GetDocumentsProps = {
  groupIds?: DocumentGroup["id"][];
  userId?: DocumentUser["id"];
  documentType?: DocumentType;
  drafts?: boolean;
  limit?: number;
};

export type GetLiveUsersProps = {
  documentIds: Document["id"][];
};

export type GetNextDocumentsProps = {
  nextPage: string;
};

export type DeleteDocumentProps = {
  documentId: Document["id"];
};
