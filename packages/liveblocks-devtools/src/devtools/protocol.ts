/**
 * Definition of all messages the Background can send to the Panel.
 */
export type BackgroundToPanelMessage =
  /**
   * The inspected window was reloaded.
   */
  { msg: "reload" };

/**
 * Definition of all messages the Panel can send to the Background.
 */
export type PanelToBackgroundMessage =
  /**
   * The panel is requesting to reload the current tab.
   */
  | { msg: "reload" }

  /**
   * The panel is requesting to open a new tab with a given URL.
   */
  | { msg: "open"; url: string };

// ----------------------------------------------------------------------------

export type FullPanelToBackgroundMessage = PanelToBackgroundMessage & {
  source: "liveblocks-devtools-panel";
  tabId: number;
};

export type FullBackgroundToPanelMessage = BackgroundToPanelMessage & {
  source: "liveblocks-devtools-background";
};
