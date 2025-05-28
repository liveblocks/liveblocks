type RoomThreadsSubscriptionSettings = "all" | "replies_and_mentions" | "none";

type RoomTextMentionsSubscriptionSettings = "mine" | "none";

export type RoomSubscriptionSettings = {
  threads: RoomThreadsSubscriptionSettings;
  textMentions: RoomTextMentionsSubscriptionSettings;
};

export type UserRoomSubscriptionSettings = {
  roomId: string;
} & RoomSubscriptionSettings;
