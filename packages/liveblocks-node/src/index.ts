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
  CommentBodyLinkElementArgs,
  CommentBodyMention,
  CommentBodyMentionElementArgs,
  CommentBodyParagraph,
  CommentBodyParagraphElementArgs,
  CommentBodyResolveUsersArgs,
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
  StringifyCommentBodyElements,
  StringifyCommentBodyOptions,
  ThreadData,
  User,
} from "@liveblocks/core";
export {
  getMentionedIdsFromCommentBody,
  stringifyCommentBody,
} from "@liveblocks/core";
