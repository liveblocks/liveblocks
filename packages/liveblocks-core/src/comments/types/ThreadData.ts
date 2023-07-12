import type { BaseMetadata } from "./BaseMetadata";
import type { CommentData } from "./CommentData";

export type ThreadData<TMetadata extends BaseMetadata = Record<never, never>> =
  {
    id: string;
    type: "thread";
    createdAt: string;
    updatedAt?: string;
    roomId: string;
    comments: CommentData[];
    metadata: TMetadata;
  };
