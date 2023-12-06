import type { BaseMetadata } from "./BaseMetadata";
import type { CommentData } from "./CommentData";

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
  createdAt: string;
  updatedAt?: string;
  comments: CommentData[];
  notificationInfo?: NotificationInfo;
  metadata: [TThreadMetadata] extends [never]
    ? Record<string, never>
    : TThreadMetadata;
};
