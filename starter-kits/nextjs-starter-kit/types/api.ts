import {
  Document,
  DocumentAccess,
  DocumentType,
  DocumentGroup,
  DocumentUser,
} from "./document";
import { RoomActiveUser, Room } from "./room";

/**
 * These types are used to unify the client/server API endpoints
 */

export type GetDocumentsResponse = {
  documents: Document[];
  nextPage: string | null;
};

export type GetStorageResponse = Record<string, unknown>;

export type CreateDocumentRequest = {
  name: Document["name"];
  type: DocumentType;
  userId: DocumentUser["id"];
  groupIds?: string; // Comma separated list of groupIds
  draft?: boolean;
};

export type UpdateDocumentRequest = {
  documentData: Partial<Room>;
};

export type UpdateDocumentScope = {
  access: DocumentAccess;
};

export type UpdateGroupRequest = {
  groupId: DocumentGroup["id"];
  access: DocumentAccess;
};

export type RemoveGroupRequest = {
  groupId: DocumentGroup["id"];
};

export type UpdateUserRequest = {
  userId: DocumentUser["id"];
  access: DocumentAccess;
};

export type RemoveUserRequest = {
  userId: DocumentUser["id"];
};

export type GetRoomsResponse = {
  nextPage: string | null;
  data: Room[];
};

export type LiveUsersResponse = {
  documentId: Document["id"];
  users: RoomActiveUser[];
};

export type ErrorData = {
  message: string;
  code?: number;
  suggestion?: string;
};

export type FetchApiResult<T = unknown> =
  | {
      data: T;
      error?: never;
    }
  | {
      error: ErrorData;
      data?: never;
    };
