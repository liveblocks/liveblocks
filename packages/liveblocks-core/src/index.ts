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

export type { Client, EnterOptions } from "./client";
export { createClient } from "./client";
export type {
  CommentBodyLinkElementArgs,
  CommentBodyMentionElementArgs,
  CommentBodyParagraphElementArgs,
  CommentBodyResolveUsersArgs,
  CommentBodyTextElementArgs,
  StringifyCommentBodyElements,
  StringifyCommentBodyOptions,
} from "./comments/comment-body";
export {
  getMentionedIdsFromCommentBody,
  stringifyCommentBody,
} from "./comments/comment-body";
export type { BaseAuthResult, Delegates } from "./connection";
export type {
  LegacyConnectionStatus,
  LostConnectionEvent,
  Status,
} from "./connection";
export {
  convertToCommentData,
  convertToCommentUserReaction,
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
export {
  legacy_patchImmutableObject,
  lsonToJson,
  patchLiveObjectKey,
} from "./immutable";
export { assert, assertNever, nn } from "./lib/assert";
export type {
  AsyncCache,
  AsyncState,
  AsyncStateError,
  AsyncStateInitial,
  AsyncStateLoading,
  AsyncStateResolved,
  AsyncStateSuccess,
} from "./lib/AsyncCache";
export { createAsyncCache } from "./lib/AsyncCache";
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
export { makePoller } from "./lib/Poller";
export { asPos, makePosition } from "./lib/position";
export type { Resolve } from "./lib/Resolve";
export { shallow } from "./lib/shallow";
export { stringify } from "./lib/stringify";
export type { Brand } from "./lib/utils";
export {
  b64decode,
  isPlainObject,
  raise,
  tryParseJson,
  withTimeout,
} from "./lib/utils";
export type { CustomAuthenticationResult } from "./protocol/Authentication";
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
export { OpCode } from "./protocol/Op";
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
  BroadcastOptions,
  History,
  Room,
  RoomEventMessage,
  RoomInitializers,
  StorageStatus,
} from "./room";
export type { GetThreadsOptions } from "./room";
export { CommentsApiError } from "./room";
export type { BaseMetadata } from "./types/BaseMetadata";
export type {
  CommentBody,
  CommentBodyBlockElement,
  CommentBodyElement,
  CommentBodyInlineElement,
  CommentBodyLink,
  CommentBodyMention,
  CommentBodyParagraph,
  CommentBodyText,
} from "./types/CommentBody";
export type {
  CommentData,
  CommentDataPlain,
  CommentReaction,
} from "./types/CommentData";
export type {
  CommentUserReaction,
  CommentUserReactionPlain,
} from "./types/CommentReaction";
export type { Immutable } from "./types/Immutable";
export type {
  InboxNotificationData,
  PartialInboxNotificationData,
  PartialInboxNotificationDataPlain,
} from "./types/InboxNotificationData";
export type {
  IWebSocket,
  IWebSocketCloseEvent,
  IWebSocketEvent,
  IWebSocketInstance,
  IWebSocketMessageEvent,
} from "./types/IWebSocket";
export { WebsocketCloseCodes } from "./types/IWebSocket";
export type { NodeMap, ParentToChildNodeMap } from "./types/NodeMap";
export type { Others, OthersEvent } from "./types/Others";
export type {
  PlainLson,
  PlainLsonFields,
  PlainLsonList,
  PlainLsonMap,
  PlainLsonObject,
} from "./types/PlainLson";
export type { RoomNotificationSettings } from "./types/RoomNotificationSettings";
export type { ThreadData, ThreadDataPlain } from "./types/ThreadData";
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
  // Retain `unknown` fields
  [unknown] extends [T] ? T :
  // Retain functions
  T extends (...args: unknown[]) => unknown ? T :
  // Resolve all other values explicitly
  { [K in keyof T]: EnsureJson<T[K]> };

// Support for DevTools
import type * as DevToolsMsg from "./devtools/protocol";
export type { DevToolsMsg };
import type * as DevTools from "./types/DevToolsTreeNode";
export type { DevTools };
