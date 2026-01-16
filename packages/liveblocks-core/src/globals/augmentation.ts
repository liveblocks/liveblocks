import type { LsonObject } from "../crdts/Lson";
import type { Json, JsonObject } from "../lib/Json";
import type { BaseActivitiesData } from "../protocol/BaseActivitiesData";
import type { BaseGroupInfo } from "../protocol/BaseGroupInfo";
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
  | "CommentMetadata"
  | "SessionMetadata"
  | "MessageData"
  | "RoomInfo"
  | "GroupInfo"
  | "ActivitiesData";

type MakeErrorString<
  K extends ExtendableTypes,
  Reason extends string = "does not match its requirements",
> = `The type you provided for '${K}' ${Reason}. To learn how to fix this, see https://liveblocks.io/docs/errors/${K}`;

type GetOverride<
  K extends ExtendableTypes,
  B,
  Reason extends string = "does not match its requirements",
> = GetOverrideOrErrorValue<K, B, MakeErrorString<K, Reason>>;

type GetOverrideOrErrorValue<
  K extends ExtendableTypes,
  B,
  ErrorType,
> = unknown extends Liveblocks[K]
  ? B
  : Liveblocks[K] extends B
    ? Liveblocks[K]
    : ErrorType;

// ------------------------------------------------------------------------

export type DP = GetOverride<
  "Presence",
  JsonObject,
  "is not a valid JSON object"
>;

export type DS = GetOverride<
  "Storage",
  LsonObject,
  "is not a valid LSON value"
>;

export type DU = GetOverrideOrErrorValue<
  "UserMeta",
  BaseUserMeta,
  // Normally, the error will be a string value, but by building this custom
  // error shape for the UserMeta type, the errors will more likely trickle
  // down into the end user's code base, instead of happening inside
  // node_modules, where it may remain hidden if skipLibCheck is set in the end
  // user's project.
  Record<"id" | "info", MakeErrorString<"UserMeta">>
>;

export type DE = GetOverride<"RoomEvent", Json, "is not a valid JSON value">;

export type DTM = GetOverride<"ThreadMetadata", BaseMetadata>;

export type DCM = GetOverride<"CommentMetadata", BaseMetadata>;

export type DSM = GetOverride<"SessionMetadata", Json, "is not a valid JSON value">;

export type DMD = GetOverride<"MessageData", Json, "is not a valid JSON value">;

export type DRI = GetOverride<"RoomInfo", BaseRoomInfo>;

export type DGI = GetOverride<"GroupInfo", BaseGroupInfo>;

export type DAD = GetOverrideOrErrorValue<
  "ActivitiesData",
  BaseActivitiesData,
  {
    [K in keyof Liveblocks["ActivitiesData"]]: "At least one of the custom notification kinds you provided for 'ActivitiesData' does not match its requirements. To learn how to fix this, see https://liveblocks.io/docs/errors/ActivitiesData";
  }
>;

export type KDAD = keyof DAD extends `$${string}`
  ? keyof DAD
  : "Custom notification kinds must start with '$' but your custom 'ActivitiesData' type contains at least one kind which doesn't. To learn how to fix this, see https://liveblocks.io/docs/errors/ActivitiesData";
