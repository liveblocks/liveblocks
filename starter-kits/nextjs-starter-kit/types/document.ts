import { User } from "./data";

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

  // The document's general permissions (group and type)
  generalPermissions: DocumentPermissions;

  // User-specific permissions mapping user IDs to their permission type
  userPermissions: Record<string, DocumentPermissionType>;

  // The user if of the document's creator
  owner: DocumentUser["id"];

  // The organization id of the document
  organization: string;

  // When the document was created (Date.toString())
  created: string;

  // When the last user connected (Date.toString())
  lastConnection: string;

  // The type of document e.g. "canvas"
  type: DocumentType;
};

export type DocumentPermissionGroup = "private" | "organization" | "public";
export type DocumentPermissionType = "read" | "write";

export type DocumentPermissions = {
  group: DocumentPermissionGroup;
  type: DocumentPermissionType;
};

export type DocumentType = "text" | "whiteboard" | "canvas" | "note";

export type DocumentUser = User & {
  access: DocumentPermissionType;
  isCurrentUser: boolean;
};

// Room metadata used when creating a new document
export interface DocumentRoomMetadata extends Record<
  string,
  string | string[]
> {
  name: Document["name"];
  type: DocumentType;
  permissionGroup: DocumentPermissionGroup;
  permissionType: DocumentPermissionType;
  owner: User["id"];
}

export type ErrorData = {
  message: string;
  code?: number;
  suggestion?: string;
};

/**
 * Documents translate into Liveblocks rooms. A room can be private, organization, or public.
 *
 * Private documents have this room data:
 * ```
 * "metadata": { name: "...", type: "whiteboard", permissionGroup: "private", permissionType: "write", owner: "alice" },
 * "defaultAccesses": [],
 * "usersAccesses": {
 *   "alice": [
 *     "room:write"
 *   ]
 * }
 * ```
 *
 * Organization documents have this room data (e.g. org is "liveblocks"):
 * ```
 * "metadata": { name: "...", type: "whiteboard", permissionGroup: "organization", permissionType: "organization", owner: "alice" },
 * "defaultAccesses": [],
 * "usersAccesses": {
 *   "alice": [
 *     "room:write"
 *   ]
 * },
 * groupsAccesses: {
 *   "liveblocks": [
 *     "room:write"
 *   ]
 * }
 * ```
 *
 * Public documents have this room data:
 * ```
 * "metadata": { name: "...", type: "whiteboard", permissionGroup: "public", permissionType: "write", owner: "alice" },
 * "defaultAccesses": ["room:write"],
 * "usersAccesses": {
 *   "alice": [
 *     "room:write"
 *   ]
 * }
 * ```
 *
 * There are two ways to set permissions in Liveblocks, read and write.
 * read:  ["room:read", "room:presence:write"]
 * write: ["room:write"]
 *
 * All types can use these accesses:
 * ```
 * "defaultAccesses": ["room:read", "room:presence:write"],
 * "usersAccesses": {
 *   "alice": [
 *     "room:write"
 *   ]
 * }
 * ```
 *
 * Additionally, all types can have multiple users added:
 * ```
 * "usersAccesses": {
 *   "alice": [
 *     "room:write"
 *   ],
 *   "bob": [
 *     "room:read", "room:presence:write"
 *   ]
 * }
 * ```
 *
 * However a room cannot be private, public, organization at the same time.
 * Only one, with individual users.
 */
