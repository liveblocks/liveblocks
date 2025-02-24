import type { ActivityData } from "./InboxNotifications";

export type BaseActivitiesData = {
  [key: `$${string}`]: ActivityData;
};
