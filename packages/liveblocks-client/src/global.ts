/**
 * The types exported in this module are intended to be augmented by end users.
 */

import type {
  BaseMetadata,
  BaseUserMeta,
  JsonObject,
  LsonObject,
} from "@liveblocks/core";

// XXX Rename to Presence later?
export interface GPresence extends JsonObject {
  /**
   * Provide your custom Presence type, by using the following construct in
   * your local Liveblocks project:
   *
   * declare module "@liveblocks/client" {
   *   interface GPresence {
   *     // your custom fields here, for example:
   *     cursor: {
   *       x: number
   *       y: number
   *     } | null
   *   }
   * }
   *
   * For more info, see XXX (document this technique)
   */
}

// XXX Rename to Storage later?
export interface GStorage extends LsonObject {
  /**
   * Provide your custom Storage type, by using the following construct in your
   * local Liveblocks project:
   *
   * declare module "@liveblocks/client" {
   *   interface GStorage {
   *     // your custom fields here, for example:
   *     animals: LiveList<string>
   *   }
   * }
   *
   * For more info, see XXX (document this technique)
   */
}

// XXX Rename to UserMeta later?
export interface GUserMeta extends BaseUserMeta {
  /**
   * Provide your custom UserMeta type, by using the following construct in
   * your local Liveblocks project:
   *
   * declare module "@liveblocks/client" {
   *   interface GUserMeta {
   *     // your custom fields here, for example:
   *     avatar: string
   *     avatar: string
   *   }
   * }
   *
   * For more info, see XXX (document this technique)
   */
}

// XXX Rename to RoomEvent later?
// XXX Issue here. We cannot "extend" Json, only JsonObject -- need to figure out how to tackle that later :(
// interface GRoomEvent extends Json
// {
//   /**
//    * Provide your custom RoomEvent type, by using the following construct
//    * in your local Liveblocks project:
//    *
//    * declare module "@liveblocks/client" {
//    *   interface GRoomEvent {
//    *     // your custom fields here
//    *   }
//    * }
//    *
//    * For more info, see XXX (document this technique)
//    */
// }

// XXX Rename to ThreadMetadata later?
export interface GThreadMetadata extends BaseMetadata {
  /**
   * Provide your custom ThreadMetadata type, by using the following construct
   * in your local Liveblocks project:
   *
   * declare module "@liveblocks/client" {
   *   interface GThreadMetadata {
   *     // your custom fields here, for example:
   *     location: {
   *       x: number
   *       y: number
   *     }
   *   }
   * }
   *
   * For more info, see XXX (document this technique)
   */
}
