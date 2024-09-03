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
  Client,
  ClientOptions,
  EnterOptions,
  OpaqueClient,
  PrivateClientApi,
  ResolveMentionSuggestionsArgs,
  ResolveRoomsInfoArgs,
  ResolveUsersArgs,
} from "./client";
export { createClient, NotificationsApiError } from "./client";
export type {
  CommentBodyLinkElementArgs,
  CommentBodyMentionElementArgs,
  CommentBodyParagraphElementArgs,
  CommentBodyTextElementArgs,
  StringifyCommentBodyElements,
  StringifyCommentBodyOptions,
} from "./comments/comment-body";
export {
  getMentionedIdsFromCommentBody,
  stringifyCommentBody,
} from "./comments/comment-body";
export type { BaseAuthResult, Delegates, LiveblocksError } from "./connection";
export type { LostConnectionEvent, Status } from "./connection";
export {
  convertToCommentData,
  convertToCommentUserReaction,
  convertToInboxNotificationData,
  convertToThreadData,
} from "./convert-plain-data";
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
export { assert, assertNever, nn } from "./lib/assert";
export type { AsyncResult, AsyncResultWithDataField } from "./lib/AsyncResult";
export {
  createCommentId,
  createInboxNotificationId,
  createThreadId,
} from "./lib/createIds";
export {
  deprecate,
  deprecateIf,
  errorIf,
  throwUsageError,
} from "./lib/deprecation";
export type { EventSource, UnsubscribeCallback } from "./lib/EventSource";
export { makeEventSource } from "./lib/EventSource";
export * as console from "./lib/fancy-console";
export { freeze } from "./lib/freeze";
export type { Json, JsonArray, JsonObject, JsonScalar } from "./lib/Json";
export { isJsonArray, isJsonObject, isJsonScalar } from "./lib/Json";
export { nanoid } from "./lib/nanoid";
export type { NoInfr } from "./lib/NoInfer";
export { objectToQuery } from "./lib/objectToQuery";
export { makePoller } from "./lib/Poller";
export { asPos, makePosition } from "./lib/position";
export type { Resolve } from "./lib/Resolve";
export { shallow } from "./lib/shallow";
export { stringify } from "./lib/stringify";
export type { Brand } from "./lib/utils";
export {
  b64decode,
  isPlainObject,
  memoizeOnSuccess,
  raise,
  tryParseJson,
  wait,
  withTimeout,
} from "./lib/utils";
export type { CustomAuthenticationResult } from "./protocol/Authentication";
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
  CommentData,
  CommentDataPlain,
  CommentReaction,
} from "./protocol/Comments";
export type {
  CommentUserReaction,
  CommentUserReactionPlain,
} from "./protocol/Comments";
export type { QueryMetadata } from "./protocol/Comments";
export type { ThreadData, ThreadDataPlain } from "./protocol/Comments";
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
export type { HistoryVersion } from "./protocol/VersionHistory";
export type { PrivateRoomApi } from "./room";
export type {
  BroadcastOptions,
  History,
  OpaqueRoom,
  OptionalTupleUnless,
  PartialUnless,
  Room,
  RoomEventMessage,
  StorageStatus,
} from "./room";
export type { GetThreadsOptions } from "./room";
export { CommentsApiError } from "./room";
export type { Immutable } from "./types/Immutable";
export type {
  IWebSocket,
  IWebSocketCloseEvent,
  IWebSocketEvent,
  IWebSocketInstance,
  IWebSocketMessageEvent,
} from "./types/IWebSocket";
export { WebsocketCloseCodes } from "./types/IWebSocket";
export type { NodeMap, ParentToChildNodeMap } from "./types/NodeMap";
export type { OptionalPromise } from "./types/OptionalPromise";
export type { OthersEvent } from "./types/Others";
export type { Patchable } from "./types/Patchable";
export type {
  PlainLson,
  PlainLsonFields,
  PlainLsonList,
  PlainLsonMap,
  PlainLsonObject,
} from "./types/PlainLson";
export type { RoomNotificationSettings } from "./types/RoomNotificationSettings";
export type { User } from "./types/User";
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
import type * as DevToolsMsg from "./devtools/protocol";
export type { DevToolsMsg };
import type { Json } from "./lib/Json";
import type * as DevTools from "./types/DevToolsTreeNode";
export type { DevTools };

// Store
export type { Store } from "./lib/create-store";
export {
  addReaction,
  applyOptimisticUpdates,
  type CacheState,
  type CacheStore,
  deleteComment,
  removeReaction,
  upsertComment,
} from "./store";
