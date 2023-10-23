import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type {
  BaseMetadata,
  BaseUserMeta,
  BroadcastOptions,
  Client,
  CommentBody,
  CommentBodyBlockElement,
  CommentBodyElement,
  CommentBodyInlineElement,
  CommentBodyLink,
  CommentBodyMention,
  CommentBodyParagraph,
  CommentBodyText,
  CommentData,
  History,
  Immutable,
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
  Others,
  Room,
  Status,
  StorageStatus,
  StorageUpdate,
  ThreadData,
  User,
} from "@liveblocks/core";
export {
  createClient,
  LiveList,
  LiveMap,
  LiveObject,
  shallow,
  toPlainLson,
} from "@liveblocks/core";

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
