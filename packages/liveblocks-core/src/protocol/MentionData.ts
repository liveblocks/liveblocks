import type { Relax } from "../lib/Relax";

export type MentionData = Relax<
  UserMentionData | GroupMentionData | AgentMentionData
>;

export type TextMentionData = Relax<UserMentionData | GroupMentionData>;

export type UserMentionData = {
  kind: "user";
  id: string;
};
export type GroupMentionData = {
  kind: "group";
  id: string;
  userIds?: string[];
};

export type AgentMentionData = {
  kind: "agent";
  id: string;
};
