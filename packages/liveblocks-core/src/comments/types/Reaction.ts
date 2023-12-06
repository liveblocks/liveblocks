import type { DateToString } from "./DateToString";

export type Reaction = {
  emoji: string;
  createdAt: Date;
  userId: string;
};

export type ReactionPlain = DateToString<Reaction>;
