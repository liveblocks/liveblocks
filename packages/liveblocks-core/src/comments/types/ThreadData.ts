import type { BaseMetadata } from "./BaseMetadata";
import type { CommentData } from "./CommentData";

export type ThreadData<ThreadMetadata extends BaseMetadata = never> = {
  type: "thread";
  id: string;
  roomId: string;
  createdAt: string;
  updatedAt?: string;
  comments: CommentData[];
  metadata: [ThreadMetadata] extends [never]
    ? Record<string, never>
    : ThreadMetadata;
};
