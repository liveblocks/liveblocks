import browser, { Runtime } from "webextension-polyfill";
import type { PanelToClientMessage, ClientToPanelMessage } from "./lib/types";

const ports: Record<string | number, Runtime.Port> = {};

browser.runtime.onConnect.addListener((port) => {
  function handleMessage(message: PanelToClientMessage & { tabId: number }) {
    //
    // NOTE: Special eaves dropping happening here when the panel sends their
    // "connect" message. While this message is intended to signify to the
    // client to begin loading the devtools window, the background also
    // utilizes this special message to register the link between the tab ID
    // and this port.
    //
    if (message.name === "connect") {
      ports[message.tabId] = port;
    }

    const { tabId, ...unpacked } = message;
    browser.tabs.sendMessage(tabId, unpacked);
  }

  port.onMessage.addListener(handleMessage);

  port.onDisconnect.addListener((port) => {
    port.onMessage.removeListener(handleMessage);

    for (const tabId of Object.keys(ports)) {
      if (ports[tabId] === port) {
        delete ports[tabId];
        break;
      }
    }
  });
});

browser.runtime.onMessage.addListener(
  (message: ClientToPanelMessage, sender) => {
    if (sender.tab) {
      const tabId = sender.tab.id;

      if (tabId in ports) {
        ports[tabId].postMessage(message);
      }
    }

    return;
  }
);

export {};
