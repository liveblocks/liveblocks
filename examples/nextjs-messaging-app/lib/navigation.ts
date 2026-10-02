import type { Channel } from "./channels";

export type SidebarTab = "home" | "dms" | "activity";

export type Selection =
  { type: "channel"; channelId: string } | { type: "dm"; userId: string };

export type MessageHighlight = {
  feedId: string;
  messageId: string;
};

export type Conversation =
  | { type: "channel"; feedId: string; channel: Channel }
  | { type: "dm"; feedId: string; user: Liveblocks["UserMeta"] };
