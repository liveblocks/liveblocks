import type { Json } from "../lib/Json";

export type Feed<FM extends Json = Json> = {
  feedId: string;
  metadata: FM;
  createdAt: number;
  updatedAt: number;
};

export type FeedMessage<FMD extends Json = Json> = {
  id: string;
  createdAt: number;
  updatedAt: number;
  data: FMD;
};
