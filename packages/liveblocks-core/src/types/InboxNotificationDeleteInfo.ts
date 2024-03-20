import type { DateToString } from "./DateToString";

export type InboxNotificationDeleteInfo = {
  type: "deletedInboxNotification";
  id: string;
  roomId: string;
  deletedAt: Date;
};

export type InboxNotificationDeleteInfoPlain =
  DateToString<InboxNotificationDeleteInfo>;
