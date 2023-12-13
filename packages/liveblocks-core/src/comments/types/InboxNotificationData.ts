export type ThreadInboxNotificationData = {
  kind: "thread";
  id: string;
  threadId: string;
  notifiedAt: string;
  readAt: string | null;
};

export type InboxNotificationData = ThreadInboxNotificationData;
