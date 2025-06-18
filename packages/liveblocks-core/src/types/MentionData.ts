import type { Relax } from "../lib/Relax";

export type MentionData = Relax<UserMentionData | GroupMentionData>;

export type UserMentionData = {
  kind: "user";
  id: string;
};
export type GroupMentionData = {
  kind: "group";
  id: string;
  userIds?: string[];
};
