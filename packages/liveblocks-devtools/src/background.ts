import browser, { Runtime } from "webextension-polyfill";
import type {
  FullPanelToClientMessage,
  FullClientToPanelMessage,
} from "./lib/protocol";

const portsByTabId: Map<number, Runtime.Port> = new Map();

browser.runtime.onConnect.addListener((port) => {
  function handleMessage(message: FullPanelToClientMessage) {
    //
    // NOTE: Special eaves dropping happening here when the panel sends their
    // "connect" message. While this message is intended to signify to the
    // client to begin loading the devtools window, the background also
    // utilizes this special message to register the link between the tab ID
    // and this port.
    //
    if (message.name === "connect") {
      portsByTabId.set(message.tabId, port);
    }

    browser.tabs.sendMessage(message.tabId, message);
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

browser.runtime.onMessage.addListener(
  (message: FullClientToPanelMessage, sender) => {
    if (sender.tab) {
      const tabId = sender.tab.id;
      portsByTabId.get(tabId)?.postMessage(message);
    }
  }
);

export {};
