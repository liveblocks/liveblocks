import type { DateToString } from "../lib/DateToString";

export type ThreadDeleteInfo = {
  type: "deletedThread";
  id: string;
  roomId: string;
  deletedAt: Date;
};

export type ThreadDeleteInfoPlain = DateToString<ThreadDeleteInfo>;
