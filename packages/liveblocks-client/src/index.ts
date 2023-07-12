// Detect if duplicate copies of Liveblocks are being loaded
import { detectDupes } from "@liveblocks/core";

const pkgName = "@liveblocks/client";
const pkgVersion =
  (typeof PKG_VERSION === "string" && PKG_VERSION) || "dev";
const pkgFormat = (typeof TSUP_FORMAT === "string" && TSUP_FORMAT) || "esm";

detectDupes(pkgName, pkgVersion, pkgFormat);

declare const PKG_VERSION: string;
declare const TSUP_FORMAT: string;

// -------------------------------------

export type {
  BaseUserMeta,
  BroadcastOptions,
  Client,
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
