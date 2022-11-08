import type {
  FullClientToPanelMessage,
  FullPanelToClientMessage,
  PanelToClientMessage,
} from "@liveblocks/core";
import browser from "webextension-polyfill";

const DEV_PANEL = "liveblocks-devtools-panel";

const port = browser.runtime.connect({ name: DEV_PANEL });

export const onMessageFromClient = port.onMessage as browser.Events.Event<
  (message: FullClientToPanelMessage) => void
>;

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
