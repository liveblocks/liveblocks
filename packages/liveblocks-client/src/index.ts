export { createClient } from "./client";
export { LiveList } from "./LiveList";
export { LiveMap } from "./LiveMap";
export { LiveObject } from "./LiveObject";
export type {
  BroadcastOptions,
  Client,
  History,
  Json,
  JsonObject,
  LiveStructure,
  Lson,
  LsonObject,
  Others,
  Presence, // Deprecated! Will get removed in 0.18
  Room,
  StorageUpdate,
  User,
  BaseUserMeta,
} from "./types";

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
