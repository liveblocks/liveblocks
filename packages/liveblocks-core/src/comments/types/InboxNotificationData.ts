import type { DateToString } from "./DateToString";

export type ThreadInboxNotificationData = {
  kind: "thread";
  id: string;
  threadId: string;
  notifiedAt: Date;
  readAt: Date | null;
};

export type InboxNotificationData = ThreadInboxNotificationData;

export type InboxNotificationDataPlain = DateToString<InboxNotificationData>;
