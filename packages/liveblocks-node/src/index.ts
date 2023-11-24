import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export { authorize } from "./authorize";
export type {
  LiveblocksOptions,
  RoomAccesses,
  RoomInfo,
  RoomPermission,
  RoomUser,
  Schema,
  ThreadParticipants,
} from "./client";
export { Liveblocks } from "./client";
export type {
  CommentBodyLinkElementArgs,
  CommentBodyMentionElementArgs,
  CommentBodyParagraphElementArgs,
  CommentBodyResolveUsersArgs,
  CommentBodyTextElementArgs,
  StringifyCommentBodyElements,
  StringifyCommentBodyOptions,
} from "./comment-body";
export {
  getMentionedIdsFromCommentBody,
  stringifyCommentBody,
} from "./comment-body";
export type {
  CommentCreatedEvent,
  CommentDeletedEvent,
  CommentEditedEvent,
  CommentReactionAdded,
  CommentReactionRemoved,
  RoomCreatedEvent,
  RoomDeletedEvent,
  StorageUpdatedEvent,
  ThreadCreatedEvent,
  ThreadMetadataUpdatedEvent,
  UserEnteredEvent,
  UserLeftEvent,
  WebhookEvent,
  WebhookRequest,
} from "./webhooks";
export { WebhookHandler } from "./webhooks";
export type {
  CommentBody,
  CommentBodyBlockElement,
  CommentBodyElement,
  CommentBodyInlineElement,
  CommentBodyLink,
  CommentBodyMention,
  CommentBodyParagraph,
  CommentBodyText,
  CommentData,
  IUserInfo,
  Json,
  JsonArray,
  JsonObject,
  JsonScalar,
  Lson,
  LsonObject,
  PlainLsonObject,
  ThreadData,
  User,
} from "@liveblocks/core";
