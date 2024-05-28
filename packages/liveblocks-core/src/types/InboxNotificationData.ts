import type { DateToString } from "./DateToString";

export type InboxNotificationThreadData = {
  kind: "thread";
  id: string;
  roomId: string;
  threadId: string;
  notifiedAt: Date;
  readAt: Date | null;
};

export type InboxNotificationTextMentionData = {
  kind: "textMention";
  id: string;
  roomId: string;
  notifiedAt: Date;
  readAt: Date | null;
  createdBy: string;
  mentionId: string;
};

export type InboxNotificationTextMentionDataPlain =
  DateToString<InboxNotificationTextMentionData>;

export type ActivityData = Record<string, string | boolean | number>;

type InboxNotificationActivity = {
  id: string;
  createdAt: Date;
  data: ActivityData;
};

export type InboxNotificationCustomData = {
  kind: `$${string}`;
  id: string;
  roomId?: string;
  subjectId: string;
  notifiedAt: Date;
  readAt: Date | null;
  activities: InboxNotificationActivity[];
};

export type InboxNotificationData =
  | InboxNotificationThreadData
  | InboxNotificationCustomData
  | InboxNotificationTextMentionData;

export type InboxNotificationThreadDataPlain =
  DateToString<InboxNotificationThreadData>;

export type InboxNotificationCustomDataPlain = Omit<
  DateToString<InboxNotificationCustomData>,
  "activities"
> & {
  activities: DateToString<InboxNotificationActivity>[];
};

export type InboxNotificationDataPlain =
  | InboxNotificationThreadDataPlain
  | InboxNotificationCustomDataPlain
  | InboxNotificationTextMentionDataPlain;
