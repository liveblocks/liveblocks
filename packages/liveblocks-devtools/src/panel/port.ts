import browser from "webextension-polyfill";
import type {
  PanelToClientMessage,
  FullPanelToClientMessage,
} from "../lib/protocol";

const DEV_PANEL = "liveblocks-devtools-panel";

const port = browser.runtime.connect({ name: DEV_PANEL });

export const { onMessage: onMessageFromClient } = port;

/**
 * Like port.postMessage(), but without having to provide the tabId to send it
 * to. Will always send to the current inspected window.
 */
export function sendMessageToClient(message: PanelToClientMessage): void {
  const fullMessage: FullPanelToClientMessage = {
    ...message,
    source: DEV_PANEL,
    tabId: browser.devtools.inspectedWindow.tabId,
  };
  port.postMessage(fullMessage);
}

// Send the initial connect event
sendMessageToClient({ name: "connect" });
