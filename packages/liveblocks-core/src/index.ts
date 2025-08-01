import { detectDupes } from "./dupe-detection";
import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

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
  AiOpaqueToolDefinition,
  AiOpaqueToolInvocationProps,
  AiToolDefinition,
  AiToolExecuteCallback,
  AiToolExecuteContext,
  AiToolInvocationProps,
  AiToolTypePack,
  WithNavigation,
} from "./ai";
export { defineAiTool } from "./ai";
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
} from "./client";
export { checkBounds, createClient } from "./client";
export type {
  CommentBodyLinkElementArgs,
  CommentBodyMentionElementArgs,
  CommentBodyParagraphElementArgs,
  CommentBodyTextElementArgs,
  StringifyCommentBodyElements,
  StringifyCommentBodyOptions,
} from "./comments/comment-body";
export {
  getMentionsFromCommentBody,
  html,
  htmlSafe,
  isCommentBodyLink,
  isCommentBodyMention,
  isCommentBodyText,
  resolveUsersInCommentBody,
  stringifyCommentBody,
} from "./comments/comment-body";
export type { BaseAuthResult, Delegates } from "./connection";
export type { LostConnectionEvent, Status } from "./connection";
export {
  convertToCommentData,
  convertToCommentUserReaction,
  convertToInboxNotificationData,
  convertToSubscriptionData,
  convertToThreadData,
  convertToUserSubscriptionData,
} from "./convert-plain-data";
export type {
  CreateManagedPoolOptions,
  ManagedPool,
} from "./crdts/AbstractCrdt";
export { createManagedPool } from "./crdts/AbstractCrdt";
export { cloneLson, isLiveNode } from "./crdts/liveblocks-helpers";
export { LiveList } from "./crdts/LiveList";
export { LiveMap } from "./crdts/LiveMap";
export { LiveObject } from "./crdts/LiveObject";
export type {
  LiveNode,
  LiveStructure,
  Lson,
  LsonObject,
  ToJson,
} from "./crdts/Lson";
export type {
  LiveListUpdate,
  LiveMapUpdate,
  LiveObjectUpdate,
  StorageUpdate,
} from "./crdts/StorageUpdates";
export type { ToImmutable } from "./crdts/utils";
export { toPlainLson } from "./crdts/utils";
export type {
  DAD,
  DE,
  DM,
  DP,
  DRI,
  DS,
  DU,
  KDAD,
} from "./globals/augmentation";
export {
  legacy_patchImmutableObject,
  lsonToJson,
  patchLiveObjectKey,
} from "./immutable";
export { kInternal } from "./internal";
export { makeAbortController } from "./lib/abortController";
export { assert, assertNever, nn } from "./lib/assert";
export type {
  AsyncError,
  AsyncLoading,
  AsyncResult,
  AsyncSuccess,
} from "./lib/AsyncResult";
export { autoRetry, HttpError } from "./lib/autoRetry";
export { chunk } from "./lib/chunk";
export { Promise_withResolvers } from "./lib/controlledPromise";
export {
  createCommentAttachmentId,
  createCommentId,
  createInboxNotificationId,
  createThreadId,
} from "./lib/createIds";
export { DefaultMap } from "./lib/DefaultMap";
export {
  deprecate,
  deprecateIf,
  errorIf,
  throwUsageError,
} from "./lib/deprecation";
export { Deque } from "./lib/Deque";
export type {
  EventSource,
  Observable,
  UnsubscribeCallback,
} from "./lib/EventSource";
export { makeEventSource } from "./lib/EventSource";
export * as console from "./lib/fancy-console";
export { freeze } from "./lib/freeze";
export { isPlainObject, isStartsWithOperator } from "./lib/guards";
export type { Json, JsonArray, JsonObject, JsonScalar } from "./lib/Json";
export { isJsonArray, isJsonObject, isJsonScalar } from "./lib/Json";
export { nanoid } from "./lib/nanoid";
export type { NoInfr } from "./lib/NoInfer";
export { objectToQuery } from "./lib/objectToQuery";
export type { Poller } from "./lib/Poller";
export { makePoller } from "./lib/Poller";
export { asPos, makePosition } from "./lib/position";
export type { Relax } from "./lib/Relax";
export type { Resolve } from "./lib/Resolve";
export { shallow, shallow2 } from "./lib/shallow";
export type { ISignal, SignalType } from "./lib/signals";
export { batch, DerivedSignal, MutableSignal, Signal } from "./lib/signals";
export { SortedList } from "./lib/SortedList";
export { stableStringify } from "./lib/stringify";
export type { QueryParams, URLSafeString } from "./lib/url";
export { generateUrl, sanitizeUrl, url, urljoin } from "./lib/url";
export type {
  Brand,
  DistributiveOmit,
  WithOptional,
  WithRequired,
} from "./lib/utils";
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
} from "./lib/utils";
export type {
  ContextualPromptContext,
  ContextualPromptResponse,
} from "./protocol/Ai";
export type { CustomAuthenticationResult } from "./protocol/Authentication";
export { Permission } from "./protocol/AuthToken";
export type { BaseActivitiesData } from "./protocol/BaseActivitiesData";
export type { BaseRoomInfo } from "./protocol/BaseRoomInfo";
export type { BaseUserMeta, IUserInfo } from "./protocol/BaseUserMeta";
export type {
  BroadcastEventClientMsg,
  ClientMsg,
  FetchStorageClientMsg,
  FetchYDocClientMsg,
  UpdatePresenceClientMsg,
  UpdateStorageClientMsg,
  UpdateYDocClientMsg,
} from "./protocol/ClientMsg";
export { ClientMsgCode } from "./protocol/ClientMsg";
export type { BaseMetadata } from "./protocol/Comments";
export type {
  CommentBody,
  CommentBodyBlockElement,
  CommentBodyElement,
  CommentBodyInlineElement,
  CommentBodyLink,
  CommentBodyMention,
  CommentBodyParagraph,
  CommentBodyText,
} from "./protocol/Comments";
export type {
  CommentAttachment,
  CommentData,
  CommentDataPlain,
  CommentLocalAttachment,
  CommentMixedAttachment,
  CommentReaction,
} from "./protocol/Comments";
export type {
  CommentUserReaction,
  CommentUserReactionPlain,
} from "./protocol/Comments";
export type { QueryMetadata } from "./protocol/Comments";
export type {
  ThreadData,
  ThreadDataPlain,
  ThreadDataWithDeleteInfo,
} from "./protocol/Comments";
export type { ThreadDeleteInfo } from "./protocol/Comments";
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
} from "./protocol/InboxNotifications";
export type { InboxNotificationDeleteInfo } from "./protocol/InboxNotifications";
export type {
  NotificationChannel,
  NotificationChannelSettings,
  NotificationKind,
  NotificationSettings,
  NotificationSettingsPlain,
  PartialNotificationSettings,
} from "./protocol/NotificationSettings";
export {
  createNotificationSettings,
  isNotificationChannelEnabled,
  patchNotificationSettings,
} from "./protocol/NotificationSettings";
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
} from "./protocol/Op";
export { ackOp, OpCode } from "./protocol/Op";
export type {
  RoomSubscriptionSettings,
  UserRoomSubscriptionSettings,
} from "./protocol/RoomSubscriptionSettings";
export type {
  IdTuple,
  SerializedChild,
  SerializedCrdt,
  SerializedList,
  SerializedMap,
  SerializedObject,
  SerializedRegister,
  SerializedRootObject,
} from "./protocol/SerializedCrdt";
export { CrdtType } from "./protocol/SerializedCrdt";
export { isChildCrdt, isRootCrdt } from "./protocol/SerializedCrdt";
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
} from "./protocol/ServerMsg";
export { ServerMsgCode } from "./protocol/ServerMsg";
export type {
  SubscriptionData,
  SubscriptionDataPlain,
  SubscriptionDeleteInfo,
  SubscriptionDeleteInfoPlain,
  SubscriptionKey,
  UserSubscriptionData,
  UserSubscriptionDataPlain,
} from "./protocol/Subscriptions";
export { getSubscriptionKey } from "./protocol/Subscriptions";
export type { HistoryVersion } from "./protocol/VersionHistory";
export type {
  IYjsProvider,
  LargeMessageStrategy,
  PrivateRoomApi,
  YjsSyncStatus,
} from "./room";
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
} from "./room";
export type { GetThreadsOptions, UploadAttachmentOptions } from "./room";
export type {
  AiAssistantContentPart,
  AiAssistantMessage,
  AiChat,
  AiChatMessage,
  AiKnowledgeSource,
  AiReasoningPart,
  AiTextPart,
  AiToolInvocationPart,
  AiUserMessage,
  CopilotId,
  Cursor,
  MessageId,
  RenderableToolResultResponse,
  ToolResultResponse,
} from "./types/ai";
export type { Awaitable } from "./types/Awaitable";
export type { Immutable } from "./types/Immutable";
export type { InferFromSchema } from "./types/InferFromSchema";
export type {
  IWebSocket,
  IWebSocketCloseEvent,
  IWebSocketEvent,
  IWebSocketInstance,
  IWebSocketMessageEvent,
} from "./types/IWebSocket";
export { WebsocketCloseCodes } from "./types/IWebSocket";
export type { LiveblocksErrorContext } from "./types/LiveblocksError";
export { LiveblocksError } from "./types/LiveblocksError";
export type { NodeMap, ParentToChildNodeMap } from "./types/NodeMap";
export type { OthersEvent } from "./types/Others";
export { TextEditorType } from "./types/Others";
export type { Patchable } from "./types/Patchable";
export type {
  PlainLson,
  PlainLsonFields,
  PlainLsonList,
  PlainLsonMap,
  PlainLsonObject,
} from "./types/PlainLson";
export type { User } from "./types/User";
export { detectDupes };
export type { MentionData, UserMentionData } from "./types/MentionData";

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
import type * as DevToolsMsg from "./devtools/protocol";
export type { DevToolsMsg };
import type { Json } from "./lib/Json";
import type * as DevTools from "./types/DevToolsTreeNode";
export type { DevTools };
