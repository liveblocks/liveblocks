import type { CommentBody } from "./CommentBody";

export type CommentReaction = {
  emoji: string;
  userId: string;
  createdAt: string;
};

/**
 * Represents a comment.
 */
export type CommentData = {
  type: "comment";
  id: string;
  threadId: string;
  roomId: string;
  userId: string;
  createdAt: string;
  editedAt?: string;
  reactions: CommentReaction[];
} & (
  | { body: CommentBody; deletedAt?: never }
  | { body?: never; deletedAt: string }
);
