import type { ActivityData } from "./InboxNotifications.js";

export type BaseActivitiesData = {
  [key: `$${string}`]: ActivityData;
};
