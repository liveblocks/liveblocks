import type { LsonObject } from "../crdts/Lson";
import type { Json, JsonObject } from "../lib/Json";
import type { BaseActivitiesData } from "../protocol/BaseActivitiesData";
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

// NOTE: When extending this list, make sure to also add respective error
// message docs (in ../../docs/pages/errors/*.mdx).
type ExtendableTypes =
  | "Presence"
  | "Storage"
  | "UserMeta"
  | "RoomEvent"
  | "ThreadMetadata"
  | "RoomInfo"
  | "ActivitiesData";

type ExtendedType<
  K extends ExtendableTypes,
  B,
  ErrorReason extends string = "does not match its requirements",
> = unknown extends Liveblocks[K]
  ? B
  : Liveblocks[K] extends B
    ? Liveblocks[K]
    : `The type you provided for '${K}' ${ErrorReason}. To learn how to fix this, see https://liveblocks.io/docs/errors/${K}`;

// ------------------------------------------------------------------------

export type DP = ExtendedType<
  "Presence",
  JsonObject,
  "is not a valid JSON object"
>;

export type DS = ExtendedType<
  "Storage",
  LsonObject,
  "is not a valid LSON value"
>;

export type DU = ExtendedType<"UserMeta", BaseUserMeta>;

export type DE = ExtendedType<"RoomEvent", Json, "is not a valid JSON value">;

export type DM = ExtendedType<"ThreadMetadata", BaseMetadata>;

export type DRI = ExtendedType<"RoomInfo", BaseRoomInfo>;
export type DAD = ExtendedType<"ActivitiesData", BaseActivitiesData>;
