import type {
  BaseMetadata,
  BaseUserMeta,
  JsonObject,
  LsonObject,
} from "@liveblocks/core";

declare global {
  /**
   * Namespace for user-defined Liveblocks types.
   */
  export namespace Liveblocks {
    export interface Presence extends JsonObject {}
    export interface Storage extends LsonObject {}
    export interface UserMeta extends BaseUserMeta {}
    export interface RoomEvent extends JsonObject {}
    export interface ThreadMetadata extends BaseMetadata {}
  }
}
