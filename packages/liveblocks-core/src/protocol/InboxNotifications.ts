import type { DAD } from "../globals/augmentation";
import type { DateToString } from "../lib/DateToString";
import type { MentionData } from "./MentionData";

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
  mention: MentionData;
};

export type InboxNotificationTextMentionDataPlain =
  DateToString<InboxNotificationTextMentionData>;

export type ActivityData = Record<
  string,
  string | boolean | number | undefined
>;

type InboxNotificationActivity<K extends keyof DAD = keyof DAD> = {
  id: string;
  createdAt: Date;
  data: DAD[K];
};

export type InboxNotificationCustomData<K extends keyof DAD = keyof DAD> = {
  kind: K;
  id: string;
  roomId?: string;
  subjectId: string;
  notifiedAt: Date;
  readAt: Date | null;
  activities: InboxNotificationActivity<K>[];
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

export type InboxNotificationDeleteInfo = {
  type: "deletedInboxNotification";
  id: string;
  roomId: string;
  deletedAt: Date;
};

export type InboxNotificationDeleteInfoPlain =
  DateToString<InboxNotificationDeleteInfo>;
