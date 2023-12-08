export type ThreadInboxNotificationData = {
  kind: "thread";
  id: string;
  threadId: string;
  notifiedAt: string;
  readAt: string;
};

export type InboxNotificationData = ThreadInboxNotificationData;
