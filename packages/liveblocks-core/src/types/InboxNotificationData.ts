import type { BaseMetadata } from "./BaseMetadata";
import type { DateToString } from "./DateToString";
import type { ThreadData } from "./ThreadData";

type PartialThreadInboxNotificationData = {
  kind: "thread";
  id: string;
  threadId: string;
  notifiedAt: Date;
  readAt: Date | null;
};

export type PartialInboxNotificationData = PartialThreadInboxNotificationData;

export type PartialInboxNotificationDataPlain =
  DateToString<PartialInboxNotificationData>;

type ThreadInboxNotificationData<TThreadMetadata extends BaseMetadata = never> =
  PartialThreadInboxNotificationData & {
    thread: ThreadData<TThreadMetadata>;
  };

export type InboxNotificationData<
  TThreadMetadata extends BaseMetadata = never,
> = ThreadInboxNotificationData<TThreadMetadata>;
