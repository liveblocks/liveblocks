import type { DateToString } from "./DateToString";

export type InboxNotificationThreadData = {
  kind: "thread";
  id: string;
  roomId: string;
  threadId: string;
  notifiedAt: Date;
  readAt: Date | null;
};

// TODO: Move and expose? And find more fitting name.
type Activity = {
  id: string;
  createdAt: Date;
  // TODO: Define `data` type
  data: any;
};

export type InboxNotificationCustomData = {
  kind: string;
  id: string;
  roomId: string;
  subjectId?: string;
  notifiedAt: Date;
  readAt: Date | null;
  activities: Activity[];
};

export type InboxNotificationData =
  | InboxNotificationThreadData
  | InboxNotificationCustomData;

type InboxNotificationThreadDataPlain =
  DateToString<InboxNotificationThreadData>;

type InboxNotificationCustomDataPlain = Omit<
  DateToString<InboxNotificationCustomData>,
  "activities"
> & {
  activities: DateToString<Activity>[];
};

export type InboxNotificationDataPlain =
  | InboxNotificationThreadDataPlain
  | InboxNotificationCustomDataPlain;
