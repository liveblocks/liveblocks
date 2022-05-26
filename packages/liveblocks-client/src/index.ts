export { LiveObject } from "./LiveObject";
export { LiveMap } from "./LiveMap";
export { LiveList } from "./LiveList";
export type {
  Others,
  Presence,
  Room,
  Client,
  User,
  BroadcastOptions,
  StorageUpdate,
  History,
} from "./types";

export type { Json, JsonObject } from "./json";
export type { Lson, LsonObject } from "./lson";

export { createClient } from "./client";

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
  T extends (...args: any[]) => any ? T :
  // Resolve all other values explicitly
  { [K in keyof T]: EnsureJson<T[K]> };
