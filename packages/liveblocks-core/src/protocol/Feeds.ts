import type { Json } from "../lib/Json";

export type Feed<FM extends Json = Json> = {
  feedId: string;
  metadata: FM;
  timestamp: number;
};

export type FeedMessage<FMD extends Json = Json> = {
  id: string;
  timestamp: number;
  data: FMD;
};
