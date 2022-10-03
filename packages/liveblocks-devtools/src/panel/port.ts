import browser from "webextension-polyfill";
import type { PanelToClientMessage } from "../lib/types";

const port = browser.runtime.connect({ name: "liveblocks-panel" });

export const { onMessage } = port;

/**
 * Like port.postMessage(), but without having to provide the tabId to send it
 * to. Will always send to the current inspected window.
 */
export function postMessage(message: PanelToClientMessage): void {
  port.postMessage({
    ...message,
    tabId: browser.devtools.inspectedWindow.tabId,
  });
}

// Send the initial connect event
postMessage({ name: "connect" });
