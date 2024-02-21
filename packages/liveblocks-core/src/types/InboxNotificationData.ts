import type { DateToString } from "./DateToString";

export type InboxNotificationThreadData = {
  kind: "thread";
  id: string;
  roomId: string;
  threadId: string;
  notifiedAt: Date;
  readAt: Date | null;
};

export type InboxNotificationData = InboxNotificationThreadData;

export type InboxNotificationDataPlain = DateToString<InboxNotificationData>;
