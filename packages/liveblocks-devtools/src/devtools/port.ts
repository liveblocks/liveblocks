import type { DevToolsMsg } from "@liveblocks/core";
import browser from "webextension-polyfill";

import type {
  FullPanelToBackgroundMessage,
  PanelToBackgroundMessage,
} from "./protocol";

const DEV_PANEL = "liveblocks-devtools-panel";

const port = browser.runtime.connect({ name: DEV_PANEL });

export const onMessage = port.onMessage as browser.Events.Event<
  (message: DevToolsMsg.FullClientToPanelMessage) => void
>;

/**
 * Like port.postMessage(), but without having to provide the tabId to send it
 * to. Will always send to the current inspected window.
 */
export function sendMessage(
  message: DevToolsMsg.PanelToClientMessage | PanelToBackgroundMessage
): void {
  const fullMessage:
    | DevToolsMsg.FullPanelToClientMessage
    | FullPanelToBackgroundMessage = {
    ...message,
    source: DEV_PANEL,
    tabId: browser.devtools.inspectedWindow.tabId,
  };
  port.postMessage(fullMessage);
}
