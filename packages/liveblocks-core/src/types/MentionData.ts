import type { Relax } from "../lib/Relax";

export type MentionData = Relax<UserMentionData>;

export type UserMentionData = {
  kind: "user";
  id: string;
};
