import type { Relax } from "../lib/Relax";

export type MentionData = Relax<UserMentionData | GroupMentionData>;

export type TextMentionData = MentionData;

export type UserMentionData = {
  kind: "user";
  id: string;
  role?: "agent";
};

export type GroupMentionData = {
  kind: "group";
  id: string;
  userIds?: string[];
};
