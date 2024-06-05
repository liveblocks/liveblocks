import type { DAD } from "../globals/augmentation";
import type { DateToString } from "../lib/DateToString";

export type InboxNotificationThreadData = {
  kind: "thread";
  id: string;
  roomId: string;
  threadId: string;
  notifiedAt: Date;
  readAt: Date | null;
};

export type ActivityData = Record<
  string,
  string | boolean | number | undefined
>;

type InboxNotificationActivity<K extends `$${string}` = `$${string}`> = {
  id: string;
  createdAt: Date;
  data: DAD[K];
};

export type InboxNotificationCustomData<K extends `$${string}` = `$${string}`> =
  {
    kind: `$${string}`;
    id: string;
    roomId?: string;
    subjectId: string;
    notifiedAt: Date;
    readAt: Date | null;
    activities: InboxNotificationActivity<K>[];
  };

export type InboxNotificationData =
  | InboxNotificationThreadData
  | InboxNotificationCustomData;

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
  | InboxNotificationCustomDataPlain;

export type InboxNotificationDeleteInfo = {
  type: "deletedInboxNotification";
  id: string;
  roomId: string;
  deletedAt: Date;
};

export type InboxNotificationDeleteInfoPlain =
  DateToString<InboxNotificationDeleteInfo>;
