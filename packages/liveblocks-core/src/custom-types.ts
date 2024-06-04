import type { LsonObject } from "./crdts/Lson";
import type { Json, JsonObject } from "./lib/Json";
import type { BaseRoomInfo } from "./protocol/BaseRoomInfo";
import type { BaseUserMeta } from "./protocol/BaseUserMeta";
import type { BaseMetadata } from "./protocol/Comments";

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

type ExtendedType<
  K extends ExtendableTypes,
  B,
  ErrorMessage,
> = unknown extends Liveblocks[K]
  ? B
  : Liveblocks[K] extends B
    ? Liveblocks[K]
    : ErrorMessage;

// TODO Craft actually useful error message, and documentation
export type DP = ExtendedType<"Presence", JsonObject, "Invalid generic">;
export type DS = ExtendedType<"Storage", LsonObject, "Invalid generic">;
export type DU = ExtendedType<"UserMeta", BaseUserMeta, "Invalid generic">;
export type DE = ExtendedType<"RoomEvent", Json, "Invalid generic">;
export type DM = ExtendedType<
  "ThreadMetadata",
  BaseMetadata,
  "Invalid generic"
>;
export type DRI = ExtendedType<"RoomInfo", BaseRoomInfo, "Invalid generic">;
