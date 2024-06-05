import type { LsonObject } from "../crdts/Lson";
import type { Json, JsonObject } from "../lib/Json";
import type { BaseRoomInfo } from "../protocol/BaseRoomInfo";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import type { BaseMetadata } from "../protocol/Comments";

declare global {
  /**
   * Namespace for user-defined Liveblocks types.
   */
  export interface Liveblocks {
    [key: string]: unknown;
  }
}

type ExtendableTypes =
  | "Presence"
  | "Storage"
  | "UserMeta"
  | "RoomEvent"
  | "ThreadMetadata"
  | "RoomInfo";

type ExtendedType<K extends ExtendableTypes, B> = unknown extends Liveblocks[K]
  ? B
  : Liveblocks[K] extends B
    ? Liveblocks[K]
    : `The type you provided for '${K}' does not match its requirements. To learn how to fix this, see https://liveblocks.io/errors/${K}`;

// TODO Craft actually useful error message, and documentation
export type DP = ExtendedType<"Presence", JsonObject>;
export type DS = ExtendedType<"Storage", LsonObject>;
export type DU = ExtendedType<"UserMeta", BaseUserMeta>;
export type DE = ExtendedType<"RoomEvent", Json>;
export type DM = ExtendedType<"ThreadMetadata", BaseMetadata>;
export type DRI = ExtendedType<"RoomInfo", BaseRoomInfo>;
