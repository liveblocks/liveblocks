import { detectDupes } from "@liveblocks/core";

import type { RoomData } from "./client.js";
import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version.js";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type {
  LiveblocksOptions,
  RoomAccesses,
  RoomData,
  RoomPermission,
  RoomUser,
  Schema,
  ThreadParticipants,
} from "./client.js";
export { Liveblocks, LiveblocksError } from "./client.js";
export type {
  CommentCreatedEvent,
  CommentDeletedEvent,
  CommentEditedEvent,
  CommentReactionAdded,
  CommentReactionRemoved,
  CustomNotificationEvent,
  NotificationEvent,
  RoomCreatedEvent,
  RoomDeletedEvent,
  StorageUpdatedEvent,
  TextMentionNotificationEvent,
  ThreadCreatedEvent,
  ThreadDeletedEvent,
  ThreadMarkedAsResolvedEvent,
  ThreadMarkedAsUnresolvedEvent,
  ThreadMetadataUpdatedEvent,
  ThreadNotificationEvent,
  UserEnteredEvent,
  UserLeftEvent,
  WebhookEvent,
  WebhookRequest,
  YDocUpdatedEvent,
} from "./webhooks.js";
export {
  isCustomNotificationEvent,
  isTextMentionNotificationEvent,
  isThreadNotificationEvent,
  WebhookHandler,
} from "./webhooks.js";
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
  isNotificationChannelEnabled,
  stringifyCommentBody,
} from "@liveblocks/core";

/**
 * @deprecated RoomInfo was renamed to RoomData, to avoid
 * confusion with the globally augmentable RoomInfo type. This
 * alias will be removed in a future version.
 */
export type RoomInfo = RoomData;
