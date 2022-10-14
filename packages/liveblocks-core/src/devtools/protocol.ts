import type { User } from "../types/User";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import type { JsonObject, JsonScalar } from "../lib/Json";

/**
 * A bit like ToImmutable<T>, but without a specific data type to convert, so
 * more of a generic/opaque version. Inside the DevTool, we can make no
 * assumptions about the actual data in storage or presence, since it can be
 * anything and depends on the app that’s being inspected.
 */
type ImmutableData =
  | JsonScalar
  | readonly ImmutableData[]
  | ImmutableDataObject
  | ReadonlyMap<string, ImmutableData>;

export type ImmutableDataObject = { readonly [key: string]: ImmutableData };

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
  { name: "connect" }; // = special message

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
  | { name: "wake-up-devtools" }
  | { name: "connected-to-room"; roomId: string }
  | { name: "disconnected-from-room"; roomId: string }
  | {
      name: "sync-state";
      roomId: string;
      storage?: ImmutableDataObject;
      me?: User<JsonObject, BaseUserMeta>;
      others?: readonly User<JsonObject, BaseUserMeta>[];
    };

// ----------------------------------------------------------------------------

export type FullPanelToClientMessage = PanelToClientMessage & {
  source: "liveblocks-devtools-panel";
  tabId: number;
};

export type FullClientToPanelMessage = ClientToPanelMessage & {
  source: "liveblocks-devtools-client";
};
