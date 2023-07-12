import type { CommentBody } from "./CommentBody";

export type CommentData = {
  id: string;
  type: "comment";
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
  userId: string;
  body?: CommentBody;
};
