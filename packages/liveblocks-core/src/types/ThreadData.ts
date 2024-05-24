import type { BaseMetadata } from "./BaseMetadata";
import type { CommentData, CommentDataPlain } from "./CommentData";
import type { DateToString } from "../lib/DateToString";

/**
 * Represents a thread of comments.
 */
export type ThreadData<M extends BaseMetadata = never> = {
  type: "thread";
  id: string;
  roomId: string;
  createdAt: Date;
  updatedAt?: Date;
  comments: CommentData[];
  metadata: [M] extends [never] ? Record<string, never> : M;
};

export interface ThreadDataWithDeleteInfo<M extends BaseMetadata = never>
  extends ThreadData<M> {
  deletedAt?: Date;
}

export type ThreadDataPlain<M extends BaseMetadata = never> = Omit<
  DateToString<ThreadData<M>>,
  "comments" | "metadata"
> & {
  comments: CommentDataPlain[];
  metadata: [M] extends [never] ? Record<string, never> : M;
};
