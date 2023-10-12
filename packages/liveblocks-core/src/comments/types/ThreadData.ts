import type { BaseMetadata } from "./BaseMetadata";
import type { CommentData } from "./CommentData";

/**
 * Represents a thread of comments.
 */
export type ThreadData<TThreadMetadata extends BaseMetadata = never> = {
  type: "thread";
  id: string;
  roomId: string;
  createdAt: string;
  updatedAt?: string;
  comments: CommentData[];
  metadata: [TThreadMetadata] extends [never]
    ? Record<string, never>
    : TThreadMetadata;
};
