import type { Relax } from "../lib/Relax";

export type MentionData = Relax<UserMentionData | GroupMentionData>;

export type TextMentionData = MentionData;

export type UserMentionData = HumanUserMentionData | AgentUserMentionData;

type HumanUserMentionData = {
  kind: "user";
  id: string;
  role?: undefined;
};

type AgentUserMentionData = {
  kind: "user";
  id: string;
  role: "agent";
};

export type GroupMentionData = {
  kind: "group";
  id: string;
  userIds?: string[];
};
