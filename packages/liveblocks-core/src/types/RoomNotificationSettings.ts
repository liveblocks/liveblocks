type RoomThreadsNotificationSettings = "all" | "replies_and_mentions" | "none";

type RoomTextMentionsNotificationSettings = "all" | "self" | "none";

export type RoomNotificationSettings = {
  threads: RoomThreadsNotificationSettings;
  textMentions: RoomTextMentionsNotificationSettings;
};
