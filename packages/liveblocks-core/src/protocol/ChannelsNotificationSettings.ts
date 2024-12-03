import type { DAD } from "../globals/augmentation";

// Will later support other pre-defined channels
// like `Slack` or `Teams`
export type NotificationChannel = "email";

export type NotificationKind<K extends keyof DAD = keyof DAD> =
  | "thread"
  | "textMention"
  | K;

export type ChannelNotificationSetting = {
  [K in NotificationKind]: boolean;
};

export type ChannelsNotificationSettings = {
  [C in NotificationChannel]: ChannelNotificationSetting;
};
