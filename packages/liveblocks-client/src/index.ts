export type {
  BaseUserMeta,
  BroadcastOptions,
  Client,
  History,
  Immutable,
  Json,
  JsonObject,
  LiveStructure,
  Lson,
  LsonObject,
  Others,
  Room,
  StorageStatus,
  StorageUpdate,
  User,
} from "@liveblocks/core";
export {
  createClient,
  LiveList,
  LiveMap,
  LiveObject,
  shallow,
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
