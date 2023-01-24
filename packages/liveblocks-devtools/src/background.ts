import type { DevToolsMsg } from "@liveblocks/core";
import type { Runtime } from "webextension-polyfill";
import browser from "webextension-polyfill";

import type {
  FullBackgroundToPanelMessage,
  FullPanelToBackgroundMessage,
} from "./devtools/protocol";

const portsByTabId: Map<number, Runtime.Port> = new Map();

/**
 * Handles messages being sent from the DevTools, intended for the browser tab
 * running the client.
 */
browser.runtime.onConnect.addListener((port) => {
  function handleMessage(
    message: DevToolsMsg.FullPanelToClientMessage | FullPanelToBackgroundMessage
  ) {
    switch (message.msg) {
      // The panel has requested to reload the current tab.
      case "reload":
        browser.tabs.reload(message.tabId);
        break;

      // The panel has requested to open a new tab with a given URL.
      case "open":
        browser.tabs.create({
          url: message.url,
        });
        break;

      //
      // NOTE: Special eaves dropping happening here when the panel sends their
      // "connect" message. While this message is intended to signify to the
      // client to begin loading the devtools window, the background also
      // utilizes this special message to register the link between the tab ID
      // and this port.
      //
      case "connect":
        portsByTabId.set(message.tabId, port);
      default: // eslint-disable-line no-fallthrough
        browser.tabs.sendMessage(message.tabId, message);
    }
  }

  port.onMessage.addListener(handleMessage);

  port.onDisconnect.addListener((port) => {
    port.onMessage.removeListener(handleMessage);

    for (const [tabId, p] of portsByTabId) {
      if (port === p) {
        portsByTabId.delete(tabId);
        break;
      }
    }
  });
});

/**
 * Registers handlers for messages coming in from the various browser tabs.
 * Senders contain the tab they were sent from, and the background script
 * routes the message to the correct dev panel window.
 */
browser.runtime.onMessage.addListener(
  (message: DevToolsMsg.FullClientToPanelMessage, sender) => {
    const tabId = sender.tab?.id;
    if (tabId) {
      portsByTabId.get(tabId)?.postMessage(message);
    }
  }
);

/**
 * Notifies the panel that its inspected window was reloaded.
 */
browser.tabs.onUpdated.addListener((tabId, { status }) => {
  if (status === "complete") {
    portsByTabId.get(tabId)?.postMessage({
      source: "liveblocks-devtools-background",
      msg: "reload",
    } as FullBackgroundToPanelMessage);
  }
});

export {};
