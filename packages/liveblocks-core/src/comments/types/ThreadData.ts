import type { BaseMetadata } from "./BaseMetadata";
import type { CommentData } from "./CommentData";

type BaseThreadData = {
  id: string;
  type: "thread";
  createdAt: string;
  updatedAt?: string;
  roomId: string;
  comments: CommentData[];
};

export type ThreadData<ThreadMetadata extends BaseMetadata = never> = [
  ThreadMetadata
] extends [never]
  ? BaseThreadData
  : BaseThreadData & { metadata: ThreadMetadata };
