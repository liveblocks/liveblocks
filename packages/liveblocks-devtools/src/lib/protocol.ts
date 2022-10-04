/**
 * Definition of all messages the Panel can send to the Client.
 */
export type PanelToClientMessage =
  // Extend message list here
  | { name: "connect" }
  | {
      name: "double-this-number-plz";
      value: number;
    };

/**
 * Definition of all messages the Client can send to the Panel.
 */
export type ClientToPanelMessage =
  // Extend message list here
  {
    name: "answer";
    value: number;
  };

// ------------------------------------------------------------

export type FullPanelToClientMessage = PanelToClientMessage & {
  source: "liveblocks-devtools-panel";
  tabId: number;
};

export type FullClientToPanelMessage = ClientToPanelMessage & {
  source: "liveblocks-devtools-client";
};
