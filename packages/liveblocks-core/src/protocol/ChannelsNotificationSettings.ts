import type { DAD } from "../globals/augmentation";

// Will later support other pre-defined channels
// like `Slack` or `Teams`
export type NotificationChannel = "email";

// `K` represents custom notification kinds
// defined in the augmentation `ActivitiesData` (e.g `liveblocks.config.ts`).
// It means the type `NotificationKind` will be shaped like:
// thread | textMention | $customKind1 | $customKind2 | ...
export type NotificationKind<K extends keyof DAD = keyof DAD> =
  | "thread"
  | "textMention"
  | K;

export type ChannelNotificationSettings = {
  [K in NotificationKind]: boolean;
};

export type ChannelsNotificationSettings = {
  [C in NotificationChannel]: ChannelNotificationSettings;
};
