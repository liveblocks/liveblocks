import type { DCM, DTM } from "../globals/augmentation";
import type { DateToString } from "../lib/DateToString";
import type { Relax } from "../lib/Relax";

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

export type CommentAttachment = {
  type: "attachment";
  id: string;
  name: string;
  size: number;
  mimeType: string;
};

export type CommentLocalAttachmentIdle = {
  type: "localAttachment";
  status: "idle";
  id: string;
  name: string;
  size: number;
  mimeType: string;
  file: File;
};

export type CommentLocalAttachmentUploading = {
  type: "localAttachment";
  status: "uploading";
  id: string;
  name: string;
  size: number;
  mimeType: string;
  file: File;
};

export type CommentLocalAttachmentUploaded = {
  type: "localAttachment";
  status: "uploaded";
  id: string;
  name: string;
  size: number;
  mimeType: string;
  file: File;
};

export type CommentLocalAttachmentError = {
  type: "localAttachment";
  status: "error";
  id: string;
  name: string;
  size: number;
  mimeType: string;
  file: File;
  error: Error;
};

export type CommentLocalAttachment =
  | CommentLocalAttachmentIdle
  | CommentLocalAttachmentUploading
  | CommentLocalAttachmentUploaded
  | CommentLocalAttachmentError;

export type CommentMixedAttachment = CommentAttachment | CommentLocalAttachment;

/**
 * Represents a comment.
 */
export type CommentData<CM extends BaseMetadata = DCM> = {
  type: "comment";
  id: string;
  threadId: string;
  roomId: string;
  userId: string;
  createdAt: Date;
  editedAt?: Date;
  reactions: CommentReaction[];
  attachments: CommentAttachment[];
  metadata: CM;
} & Relax<{ body: CommentBody } | { deletedAt: Date }>;

export type CommentDataPlain<CM extends BaseMetadata = DCM> = Omit<
  DateToString<CommentData<CM>>,
  "reactions" | "body" | "metadata"
> & {
  reactions: DateToString<CommentReaction>[];
  metadata: CM;
} & Relax<{ body: CommentBody } | { deletedAt: string }>;

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

export type CommentBodyMention = Relax<
  CommentBodyUserMention | CommentBodyGroupMention
>;

type CommentBodyUserMention = {
  type: "mention";
  kind: "user";
  id: string;
};

type CommentBodyGroupMention = {
  type: "mention";
  kind: "group";
  id: string;
  userIds?: string[];
};

export type CommentBodyLink = {
  type: "link";
  url: string;
  text?: string;
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

export type SearchCommentsResult = {
  threadId: string;
  commentId: string;
  content: string;
};

/**
 * Represents a thread of comments.
 */
export type ThreadData<
  TM extends BaseMetadata = DTM,
  CM extends BaseMetadata = DCM,
> = {
  type: "thread";
  id: string;
  roomId: string;
  createdAt: Date;
  updatedAt: Date;
  comments: CommentData<CM>[];
  metadata: TM;
  resolved: boolean;
};

export interface ThreadDataWithDeleteInfo<
  TM extends BaseMetadata = DTM,
  CM extends BaseMetadata = DCM,
> extends ThreadData<TM, CM> {
  deletedAt?: Date;
}

export type ThreadDataPlain<
  TM extends BaseMetadata = DTM,
  CM extends BaseMetadata = DCM,
> = Omit<DateToString<ThreadData<TM, CM>>, "comments" | "metadata"> & {
  comments: CommentDataPlain<CM>[];
  metadata: TM;
};

export type ThreadDeleteInfo = {
  type: "deletedThread";
  id: string;
  roomId: string;
  deletedAt: Date;
};

export type ThreadDeleteInfoPlain = DateToString<ThreadDeleteInfo>;

type StringOperators<T> =
  | T
  | {
      startsWith: string;
    };

type NumberOperators<T> =
  | T
  | {
      lt?: number;
      gt?: number;
      lte?: number;
      gte?: number;
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
  [K in keyof M]:
    | (string extends M[K] ? StringOperators<M[K]> : M[K])
    | (number extends M[K] ? NumberOperators<M[K]> : M[K])
    | null;
};
