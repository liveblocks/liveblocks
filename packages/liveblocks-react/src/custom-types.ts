import type {
  BaseMetadata,
  BaseUserMeta,
  Json,
  JsonObject,
  LsonObject,
} from "@liveblocks/core";

type ExtendableTypes =
  | "Presence"
  | "Storage"
  | "UserMeta"
  | "RoomEvent"
  | "ThreadMetadata";

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
