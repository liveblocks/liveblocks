import type { DateToString } from "../lib/DateToString";

export type BaseMetadata = Record<
  string,
  string | boolean | number | undefined
>;

export type CommentReaction = {
  emoji: string;
  createdAt: Date;
  users: {
    id: string;
  }[];
};

/**
 * Represents a comment.
 */
export type CommentData = {
  type: "comment";
  id: string;
  threadId: string;
  roomId: string;
  userId: string;
  createdAt: Date;
  editedAt?: Date;
  reactions: CommentReaction[];
} & (
  | { body: CommentBody; deletedAt?: never }
  | { body?: never; deletedAt: Date }
);

export type CommentDataPlain = Omit<
  DateToString<CommentData>,
  "reactions" | "body"
> & {
  reactions: DateToString<CommentReaction>[];
} & (
    | { body: CommentBody; deletedAt?: never }
    | { body?: never; deletedAt: string }
  );

export type CommentBodyBlockElement = CommentBodyParagraph;

export type CommentBodyInlineElement =
  | CommentBodyText
  | CommentBodyMention
  | CommentBodyLink;

export type CommentBodyElement =
  | CommentBodyBlockElement
  | CommentBodyInlineElement;

export type CommentBodyParagraph = {
  type: "paragraph";
  children: CommentBodyInlineElement[];
};

export type CommentBodyMention = {
  type: "mention";
  id: string;
};

export type CommentBodyLink = {
  type: "link";
  url: string;
};

export type CommentBodyText = {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  text: string;
};

export type CommentBody = {
  version: 1;
  content: CommentBodyBlockElement[];
};

export type CommentUserReaction = {
  emoji: string;
  createdAt: Date;
  userId: string;
};

export type CommentUserReactionPlain = DateToString<CommentUserReaction>;

/**
 * Represents a thread of comments.
 */
export type ThreadData<M extends BaseMetadata = never> = {
  type: "thread";
  id: string;
  roomId: string;
  createdAt: Date;
  updatedAt?: Date;
  comments: CommentData[];
  metadata: [M] extends [never] ? Record<string, never> : M;
};

export interface ThreadDataWithDeleteInfo<M extends BaseMetadata = never>
  extends ThreadData<M> {
  deletedAt?: Date;
}

export type ThreadDataPlain<M extends BaseMetadata = never> = Omit<
  DateToString<ThreadData<M>>,
  "comments" | "metadata"
> & {
  comments: CommentDataPlain[];
  metadata: [M] extends [never] ? Record<string, never> : M;
};

export type ThreadDeleteInfo = {
  type: "deletedThread";
  id: string;
  roomId: string;
  deletedAt: Date;
};

export type ThreadDeleteInfoPlain = DateToString<ThreadDeleteInfo>;

type QueryMetadataStringValue<T extends string> =
  | T
  | {
      startsWith: string;
    };

/**
 * This type can be used to build a metadata query string (compatible
 * with `@liveblocks/query-parser`) through a type-safe API.
 *
 * In addition to exact values (`:` in query string), it adds:
 * - to strings:
 *  - `startsWith` (`^` in query string)
 */
export type QueryMetadata<M extends BaseMetadata> = {
  [K in keyof M]: M[K] extends string ? QueryMetadataStringValue<M[K]> : M[K];
};
