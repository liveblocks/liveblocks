// Will later support other pre-defined channels
// like `Slack` or `Teams`
export type NotificationChannel = "email";

export type CustomNotificationKind = `$${string}`;
export type NotificationKind =
  | "thread"
  | "textMention"
  | CustomNotificationKind;

export type ChannelNotificationSetting = {
  [K in NotificationKind]: boolean;
};

export type ChannelNotificationSettings = {
  [K in NotificationChannel]: ChannelNotificationSetting;
};
