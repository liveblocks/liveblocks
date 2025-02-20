import { detectDupes } from "./dupe-detection.js";
import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version.js";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

/**
 * PRIVATE / INTERNAL APIS
 * -----------------------
 *
 * This module is intended for internal use only, PLEASE DO NOT RELY ON ANY OF
 * THE EXPORTS IN HERE. These are implementation details that can change at any
 * time and without announcement. This module purely exists to share code
 * between the several Liveblocks packages.
 *
 * But since you're so deep inside Liveblocks code... we're hiring!
 * https://join.team/liveblocks ;)
 */

export type {
  Client,
  ClientOptions,
  EnterOptions,
  OpaqueClient,
  PrivateClientApi,
  ResolveMentionSuggestionsArgs,
  ResolveRoomsInfoArgs,
  ResolveUsersArgs,
  SyncStatus,
} from "./client.js";
export { createClient } from "./client.js";
export type {
  CommentBodyLinkElementArgs,
  CommentBodyMentionElementArgs,
  CommentBodyParagraphElementArgs,
  CommentBodyTextElementArgs,
  StringifyCommentBodyElements,
  StringifyCommentBodyOptions,
} from "./comments/comment-body.js";
export {
  getMentionedIdsFromCommentBody,
  html,
  htmlSafe,
  isCommentBodyLink,
  isCommentBodyMention,
  isCommentBodyText,
  resolveUsersInCommentBody,
  stringifyCommentBody,
  toAbsoluteUrl,
} from "./comments/comment-body.js";
export { generateCommentUrl } from "./comments/comment-url.js";
export type { BaseAuthResult, Delegates } from "./connection.js";
export type { LostConnectionEvent, Status } from "./connection.js";
export {
  convertToCommentData,
  convertToCommentUserReaction,
  convertToInboxNotificationData,
  convertToThreadData,
} from "./convert-plain-data.js";
export { cloneLson, isLiveNode } from "./crdts/liveblocks-helpers.js";
export { LiveList } from "./crdts/LiveList.js";
export { LiveMap } from "./crdts/LiveMap.js";
export { LiveObject } from "./crdts/LiveObject.js";
export type {
  LiveNode,
  LiveStructure,
  Lson,
  LsonObject,
  ToJson,
} from "./crdts/Lson.js";
export type {
  LiveListUpdate,
  LiveMapUpdate,
  LiveObjectUpdate,
  StorageUpdate,
} from "./crdts/StorageUpdates.js";
export type { ToImmutable } from "./crdts/utils.js";
export { toPlainLson } from "./crdts/utils.js";
export type {
  DAD,
  DE,
  DM,
  DP,
  DRI,
  DS,
  DU,
  KDAD,
} from "./globals/augmentation.js";
export {
  legacy_patchImmutableObject,
  lsonToJson,
  patchLiveObjectKey,
} from "./immutable.js";
export { kInternal } from "./internal.js";
export { assert, assertNever, nn } from "./lib/assert.js";
export type {
  AsyncError,
  AsyncLoading,
  AsyncResult,
  AsyncSuccess,
} from "./lib/AsyncResult.js";
export { autoRetry, HttpError } from "./lib/autoRetry.js";
export { chunk } from "./lib/chunk.js";
export { Promise_withResolvers } from "./lib/controlledPromise.js";
export {
  createCommentAttachmentId,
  createCommentId,
  createInboxNotificationId,
  createThreadId,
} from "./lib/createIds.js";
export { DefaultMap } from "./lib/DefaultMap.js";
export {
  deprecate,
  deprecateIf,
  errorIf,
  throwUsageError,
} from "./lib/deprecation.js";
export type {
  EventSource,
  Observable,
  UnsubscribeCallback,
} from "./lib/EventSource.js";
export { makeEventSource } from "./lib/EventSource.js";
export * as console from "./lib/fancy-console.js";
export { freeze } from "./lib/freeze.js";
export { isPlainObject, isStartsWithOperator } from "./lib/guards.js";
export type { Json, JsonArray, JsonObject, JsonScalar } from "./lib/Json.js";
export { isJsonArray, isJsonObject, isJsonScalar } from "./lib/Json.js";
export { nanoid } from "./lib/nanoid.js";
export type { NoInfr } from "./lib/NoInfer.js";
export { objectToQuery } from "./lib/objectToQuery.js";
export type { Poller } from "./lib/Poller.js";
export { makePoller } from "./lib/Poller.js";
export { asPos, makePosition } from "./lib/position.js";
export type { Relax } from "./lib/Relax.js";
export type { Resolve } from "./lib/Resolve.js";
export { shallow } from "./lib/shallow.js";
export type { ISignal, SignalType } from "./lib/signals.js";
export { batch, DerivedSignal, MutableSignal, Signal } from "./lib/signals.js";
export { SortedList } from "./lib/SortedList.js";
export { stableStringify } from "./lib/stringify.js";
export type { QueryParams, URLSafeString } from "./lib/url.js";
export { url, urljoin } from "./lib/url.js";
export type { Brand, DistributiveOmit } from "./lib/utils.js";
export {
  b64decode,
  compactObject,
  entries,
  keys,
  mapValues,
  memoizeOnSuccess,
  raise,
  tryParseJson,
  wait,
  withTimeout,
} from "./lib/utils.js";
export type {
  ContextualPromptContext,
  ContextualPromptResponse,
} from "./protocol/Ai.js";
export type { CustomAuthenticationResult } from "./protocol/Authentication.js";
export { Permission } from "./protocol/AuthToken.js";
export type { BaseActivitiesData } from "./protocol/BaseActivitiesData.js";
export type { BaseRoomInfo } from "./protocol/BaseRoomInfo.js";
export type { BaseUserMeta, IUserInfo } from "./protocol/BaseUserMeta.js";
export type {
  BroadcastEventClientMsg,
  ClientMsg,
  FetchStorageClientMsg,
  FetchYDocClientMsg,
  UpdatePresenceClientMsg,
  UpdateStorageClientMsg,
  UpdateYDocClientMsg,
} from "./protocol/ClientMsg.js";
export { ClientMsgCode } from "./protocol/ClientMsg.js";
export type { BaseMetadata } from "./protocol/Comments.js";
export type {
  CommentBody,
  CommentBodyBlockElement,
  CommentBodyElement,
  CommentBodyInlineElement,
  CommentBodyLink,
  CommentBodyMention,
  CommentBodyParagraph,
  CommentBodyText,
} from "./protocol/Comments.js";
export type {
  CommentAttachment,
  CommentData,
  CommentDataPlain,
  CommentLocalAttachment,
  CommentMixedAttachment,
  CommentReaction,
} from "./protocol/Comments.js";
export type {
  CommentUserReaction,
  CommentUserReactionPlain,
} from "./protocol/Comments.js";
export type { QueryMetadata } from "./protocol/Comments.js";
export type {
  ThreadData,
  ThreadDataPlain,
  ThreadDataWithDeleteInfo,
} from "./protocol/Comments.js";
export type { ThreadDeleteInfo } from "./protocol/Comments.js";
export type {
  ActivityData,
  InboxNotificationCustomData,
  InboxNotificationCustomDataPlain,
  InboxNotificationData,
  InboxNotificationDataPlain,
  InboxNotificationTextMentionData,
  InboxNotificationTextMentionDataPlain,
  InboxNotificationThreadData,
  InboxNotificationThreadDataPlain,
} from "./protocol/InboxNotifications.js";
export type { InboxNotificationDeleteInfo } from "./protocol/InboxNotifications.js";
export type {
  AckOp,
  CreateListOp,
  CreateMapOp,
  CreateObjectOp,
  CreateOp,
  CreateRegisterOp,
  DeleteCrdtOp,
  DeleteObjectKeyOp,
  Op,
  SetParentKeyOp,
  UpdateObjectOp,
} from "./protocol/Op.js";
export { ackOp, OpCode } from "./protocol/Op.js";
export type {
  IdTuple,
  SerializedChild,
  SerializedCrdt,
  SerializedList,
  SerializedMap,
  SerializedObject,
  SerializedRegister,
  SerializedRootObject,
} from "./protocol/SerializedCrdt.js";
export { CrdtType } from "./protocol/SerializedCrdt.js";
export { isChildCrdt, isRootCrdt } from "./protocol/SerializedCrdt.js";
export type {
  BroadcastedEventServerMsg,
  CommentsEventServerMsg,
  InitialDocumentStateServerMsg,
  RejectedStorageOpServerMsg,
  RoomStateServerMsg,
  ServerMsg,
  UpdatePresenceServerMsg,
  UpdateStorageServerMsg,
  UserJoinServerMsg,
  UserLeftServerMsg,
  YDocUpdateServerMsg,
} from "./protocol/ServerMsg.js";
export { ServerMsgCode } from "./protocol/ServerMsg.js";
export type {
  NotificationChannel,
  NotificationChannelSettings,
  NotificationKind,
  PartialUserNotificationSettings,
  UserNotificationSettings,
} from "./protocol/UserNotificationSettings.js";
export { isNotificationChannelEnabled } from "./protocol/UserNotificationSettings.js";
export type { HistoryVersion } from "./protocol/VersionHistory.js";
export type {
  IYjsProvider,
  LargeMessageStrategy,
  PrivateRoomApi,
  YjsSyncStatus,
} from "./room.js";
export type {
  BroadcastOptions,
  History,
  OpaqueRoom,
  OptionalTupleUnless,
  PartialUnless,
  Room,
  RoomEventMessage,
  StorageStatus,
  SyncSource,
} from "./room.js";
export type { GetThreadsOptions, UploadAttachmentOptions } from "./room.js";
export type { Awaitable } from "./types/Awaitable.js";
export type { Immutable } from "./types/Immutable.js";
export type {
  IWebSocket,
  IWebSocketCloseEvent,
  IWebSocketEvent,
  IWebSocketInstance,
  IWebSocketMessageEvent,
} from "./types/IWebSocket.js";
export { WebsocketCloseCodes } from "./types/IWebSocket.js";
export type { LiveblocksErrorContext } from "./types/LiveblocksError.js";
export { LiveblocksError } from "./types/LiveblocksError.js";
export type { NodeMap, ParentToChildNodeMap } from "./types/NodeMap.js";
export type { OthersEvent } from "./types/Others.js";
export { TextEditorType } from "./types/Others.js";
export type { Patchable } from "./types/Patchable.js";
export type {
  PlainLson,
  PlainLsonFields,
  PlainLsonList,
  PlainLsonMap,
  PlainLsonObject,
} from "./types/PlainLson.js";
export type { RoomNotificationSettings } from "./types/RoomNotificationSettings.js";
export type { User } from "./types/User.js";
export { detectDupes };

/**
 * Helper type to help users adopt to Lson types from interface definitions.
 * You should only use this to wrap interfaces you don't control. For more
 * information, see
 * https://liveblocks.io/docs/guides/limits#lson-constraint-and-interfaces
 */
// prettier-ignore
export type EnsureJson<T> =
  // Retain all valid `JSON` fields
  T extends Json ? T :
  // Retain all valid arrays
  T extends Array<infer I> ? (EnsureJson<I>)[] :
  // Retain `unknown` fields, but just treat them as if they're Json | undefined
  [unknown] extends [T] ? Json | undefined :
  // Dates become strings when serialized to JSON
  T extends Date ? string :
  // Remove functions
  T extends (...args: any[]) => any ? never :
  // Resolve all other values explicitly
  { [K in keyof T as EnsureJson<T[K]> extends never ? never : K]: EnsureJson<T[K]> };

// Support for DevTools
import type * as DevToolsMsg from "./devtools/protocol.js";
export type { DevToolsMsg };
import { HttpError } from "./lib/autoRetry.js";
import type { Json } from "./lib/Json.js";
import type * as DevTools from "./types/DevToolsTreeNode.js";
export type { DevTools };

// Deprecated APIs
/** @deprecated Use HttpError instead. */
export const CommentsApiError = HttpError;
/** @deprecated Use HttpError instead. */
export const NotificationsApiError = HttpError;
