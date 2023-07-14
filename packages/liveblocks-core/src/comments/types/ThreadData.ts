import type { BaseMetadata } from "./BaseMetadata";
import type { CommentData } from "./CommentData";

export type ThreadData<ThreadMetadata extends BaseMetadata = never> = {
  id: string;
  type: "thread";
  createdAt: string;
  updatedAt?: string;
  roomId: string;
  comments: CommentData[];
  metadata: ThreadMetadata;
};
