import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type {
  LiveblocksOptions,
  RoomAccesses,
  RoomData,
  RoomPermission,
  RoomUser,
  Schema,
  ThreadParticipants,
} from "./client";
export { Liveblocks, LiveblocksError } from "./client";
export type {
  CommentCreatedEvent,
  CommentDeletedEvent,
  CommentEditedEvent,
  CommentReactionAdded,
  CommentReactionRemoved,
  NotificationEvent,
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
  CommentBodyLinkElementArgs,
  CommentBodyMention,
  CommentBodyMentionElementArgs,
  CommentBodyParagraph,
  CommentBodyParagraphElementArgs,
  CommentBodyText,
  CommentBodyTextElementArgs,
  CommentData,
  CommentUserReaction,
  IUserInfo,
  Json,
  JsonArray,
  JsonObject,
  JsonScalar,
  Lson,
  LsonObject,
  PlainLsonObject,
  ResolveUsersArgs,
  StringifyCommentBodyElements,
  StringifyCommentBodyOptions,
  ThreadData,
  User,
} from "@liveblocks/core";
export {
  getMentionedIdsFromCommentBody,
  stringifyCommentBody,
} from "@liveblocks/core";
