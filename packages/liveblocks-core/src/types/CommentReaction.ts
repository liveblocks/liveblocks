import type { DateToString } from "../lib/DateToString";

export type CommentUserReaction = {
  emoji: string;
  createdAt: Date;
  userId: string;
};

export type CommentUserReactionPlain = DateToString<CommentUserReaction>;
