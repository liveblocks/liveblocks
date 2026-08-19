import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type { WebhookOptions } from "./webhook";
export { Webhook } from "./webhook";
export type {
  CommentCreatedEvent,
  CommentDeletedEvent,
  CommentEditedEvent,
  CommentReactionAdded,
  CommentReactionRemoved,
  CustomNotificationEvent,
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
  YDocUpdatedEvent,
} from "@liveblocks/node";
