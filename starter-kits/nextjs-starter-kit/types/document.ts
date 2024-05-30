import { Group, User } from "./data";

/**
 * This is the main type of your Documents.
 * Make sure to edit /lib/server/utils/buildDocuments.ts when adding new
 * properties.
 */
export type Document = {
  // Equivalent to Liveblocks room id
  id: string;

  // The document's name
  name: string;

  // Arrays containing access levels
  accesses: DocumentAccesses;

  // The user if of the document's creator
  owner: DocumentUser["id"];

  // When the document was created (Date.toString())
  created: string;

  // When the last user connected (Date.toString())
  lastConnection: string;

  // If the room is a draft (which has no groups or public access) or not
  draft: boolean;

  // The type of document e.g. "canvas"
  type: DocumentType;
};

export type DocumentType = "text" | "whiteboard" | "spreadsheet";

export type DocumentGroup = Group & {
  access: DocumentAccess;
};

export type DocumentUser = User & {
  access: DocumentAccess;
  isCurrentUser: boolean;
};

export enum DocumentAccess {
  // Can edit, read, and modify invited users
  FULL = "full",

  // Can edit and read the document
  EDIT = "edit",

  // Can only read the document
  READONLY = "readonly",

  // Can't view the document
  NONE = "none",
}

export type DocumentAccesses = {
  default: DocumentAccess;
  groups: Record<DocumentGroup["id"], DocumentAccess>;
  users: Record<DocumentUser["id"], DocumentAccess>;
};

// Room metadata used when creating a new document
export interface DocumentRoomMetadata
  extends Record<string, string | string[]> {
  name: Document["name"];
  type: DocumentType;
  owner: User["id"];
  draft: "yes" | "no";
}

export type ErrorData = {
  message: string;
  code?: number;
  suggestion?: string;
};
