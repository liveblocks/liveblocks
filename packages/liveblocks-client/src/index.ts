import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type {
  BaseActivitiesData,
  BaseMetadata,
  BaseUserMeta,
  BroadcastOptions,
  Client,
  ClientOptions,
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
  CommentReaction,
  EnsureJson,
  History,
  HistoryVersion,
  Immutable,
  InboxNotificationData,
  IUserInfo,
  Json,
  JsonArray,
  JsonObject,
  JsonScalar,
  LiveListUpdate,
  LiveMapUpdate,
  LiveObjectUpdate,
  LiveStructure,
  LostConnectionEvent,
  Lson,
  LsonObject,
  OthersEvent,
  PlainLsonObject,
  ResolveMentionSuggestionsArgs,
  ResolveRoomsInfoArgs,
  ResolveUsersArgs,
  Room,
  RoomNotificationSettings,
  Status,
  StorageStatus,
  StorageUpdate,
  StringifyCommentBodyElements,
  StringifyCommentBodyOptions,
  ThreadData,
  User,
  Version,
} from "@liveblocks/core";
export {
  createClient,
  getMentionedIdsFromCommentBody,
  LiveList,
  LiveMap,
  LiveObject,
  shallow,
  stringifyCommentBody,
  toPlainLson,
} from "@liveblocks/core";
