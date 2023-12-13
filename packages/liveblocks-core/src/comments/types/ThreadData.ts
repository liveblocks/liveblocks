import type { BaseMetadata } from "./BaseMetadata";
import type { CommentData, CommentDataPlain } from "./CommentData";
import type { DateToString } from "./DateToString";

type NotificationInfo = {
  id: string;
  readAt: string | null;
  notifiedAt: string;
};

/**
 * Represents a thread of comments.
 */
export type ThreadData<TThreadMetadata extends BaseMetadata = never> = {
  type: "thread";
  id: string;
  roomId: string;
  createdAt: Date;
  updatedAt?: Date;
  comments: CommentData[];
  notificationInfo?: NotificationInfo;
  metadata: [TThreadMetadata] extends [never]
    ? Record<string, never>
    : TThreadMetadata;
};

export type ThreadDataPlain<TThreadMetadata extends BaseMetadata = never> =
  Omit<DateToString<ThreadData<TThreadMetadata>>, "comments" | "metadata"> & {
    comments: CommentDataPlain[];
    metadata: [TThreadMetadata] extends [never]
      ? Record<string, never>
      : TThreadMetadata;
  };
