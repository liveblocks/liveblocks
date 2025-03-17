type RoomThreadsNotificationSettings = "all" | "replies_and_mentions" | "none";

type RoomTextMentionsNotificationSettings = "mine" | "none";

export type RoomNotificationSettings = {
  threads: RoomThreadsNotificationSettings;
  textMentions: RoomTextMentionsNotificationSettings;
};
