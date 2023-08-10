import type { CommentBody } from "./CommentBody";

export type CommentData = {
  type: "comment";
  id: string;
  threadId: string;
  roomId: string;
  userId: string;
  createdAt: string;
  editedAt?: string;
} & (
  | { body: CommentBody; mentionedIds: string[]; deletedAt?: never }
  | { body?: never; mentionedIds: []; deletedAt: string }
);
