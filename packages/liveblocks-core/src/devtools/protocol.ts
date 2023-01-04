import type { Json, JsonObject } from "../lib/Json";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import type { ConnectionState } from "../room";
import type { User } from "../types/User";

export type JsonTreeNode<TKey = string | number, TValue = Json> = {
  type: "Json";
  id: string;
  key: TKey;
  value: TValue;
};

export type ObjectTreeNode<K = string | number> = {
  type: "Object";
  id: string;
  key: K;
  fields: PrimitiveTreeNode[];
};

export type UserTreeNode<
  TUser extends User<JsonObject, BaseUserMeta> = User<JsonObject, BaseUserMeta>
> = {
  type: "User";
  id: string;
  key: number | string;
  isReadOnly: boolean;
  fields: PrimitiveTreeNode<keyof TUser>[];
};

export type LiveMapTreeNode = {
  type: "LiveMap";
  id: string;
  key: number | string;
  entries: StorageTreeNode[];
};

export type LiveListTreeNode = {
  type: "LiveList";
  id: string;
  key: number | string;
  items: StorageTreeNode[];
};

export type LiveObjectTreeNode = {
  type: "LiveObject";
  id: string;
  key: number | string;
  fields: StorageTreeNode[];
};

export type PrimitiveTreeNode<TKey = string | number> =
  | ObjectTreeNode<TKey>
  | JsonTreeNode<TKey>;

export type StorageTreeNode =
  | LiveMapTreeNode
  | LiveListTreeNode
  | LiveObjectTreeNode
  | PrimitiveTreeNode;

export type TreeNode = StorageTreeNode | UserTreeNode;

/**
 * Definition of all messages the Panel can send to the Client.
 */
export type PanelToClientMessage =
  /**
   * Initial message from the panel to the client, used for two purposes.
   * 1. First, it’s eavesdropped by the background script, which uses this
   *    message to register a "port", which sets up a channel for two-way
   *    communication between panel and client for the remainder of the time.
   * 2. It signifies to the client that the devpanel is listening.
   */
  | { msg: "connect" } // = special message

  /**
   * Expresses to the client that the devtool is interested in
   * receiving the "sync stream" for the room. The sync stream
   * that follows is an initial "full sync", followed by many
   * "partial" syncs, happening for every update.
   */
  | {
      msg: "room::subscribe";
      roomId: string;
    }

  /**
   * Expresses to the client that the devtool no longer is
   * interested in the "sync stream" for a room, for example,
   * because the devtools panel is closed, or if it switched to
   * a different room.
   */
  | {
      msg: "room::unsubscribe";
      roomId: string;
    };

/**
 * Definition of all messages the Client can send to the Panel.
 */
export type ClientToPanelMessage =
  /**
   * Initial message sent by the client to test if a dev panel is listening.
   * This is necessary in cases where the dev panel is already opened and
   * listened, before the client is loaded. If the panel receives this message,
   * it will replay its initial "connect" message, which triggers the loading
   * of the two-way connection.
   */
  | { msg: "wake-up-devtools" }

  /**
   * Sent when a new room is available for the dev panel to track and watch.
   * Sent by the client as soon as the room is attempted to be entered. This
   * happens _before_ the actual connection to the room server is established,
   * meaning the room is visible to the devtools even while it is connecting.
   */
  | {
      msg: "room::available";
      roomId: string;
    }

  /**
   * Sent when a room is left and the client loses track of the room instance.
   */
  | {
      msg: "room::unavailable";
      roomId: string;
    }

  /**
   * Sent initially, to synchronize the entire current state of the room.
   */
  | {
      msg: "room::sync::full";
      roomId: string;
      status: ConnectionState;
      storage: readonly StorageTreeNode[] | null;
      me: UserTreeNode | null;
      others: readonly UserTreeNode[];
    }

  /**
   * Sent whenever something about the internals of a room changes.
   */
  | {
      msg: "room::sync::partial";
      roomId: string;
      status?: ConnectionState;
      storage?: readonly StorageTreeNode[];
      me?: UserTreeNode;
      others?: readonly UserTreeNode[];
    };

// ----------------------------------------------------------------------------

export type FullPanelToClientMessage = PanelToClientMessage & {
  source: "liveblocks-devtools-panel";
  tabId: number;
};

export type FullClientToPanelMessage = ClientToPanelMessage & {
  source: "liveblocks-devtools-client";
};
