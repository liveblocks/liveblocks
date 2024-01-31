type RoomThreadsNotificationSettings = "all" | "replies_and_mentions" | "none";

export type RoomNotificationSettings = {
  threads: RoomThreadsNotificationSettings;
};
