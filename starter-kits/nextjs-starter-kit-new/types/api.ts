import { RoomUser } from "@liveblocks/node";
import { UserInfo } from "@/liveblocks.config";
import { Document } from "./document";

/**
 * These types are used to unify the client/server API endpoints
 */

export type GetDocumentsResponse = {
  documents: Document[];
  nextCursor: string | null;
};

export type LiveUsersResponse = {
  documentId: Document["id"];
  users: RoomUser<UserInfo>[];
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
