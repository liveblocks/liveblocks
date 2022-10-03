import browser, { Runtime } from "webextension-polyfill";
import { PORT_INITIAL_EVENT } from "./constants";

const ports: Record<string | number, Runtime.Port> = {};

interface Message {
  name: string;
  tabId: number;
}

browser.runtime.onConnect.addListener((port) => {
  function handleMessage(message: Message) {
    if (message.name == PORT_INITIAL_EVENT) {
      ports[message.tabId] = port;
    } else {
      browser.tabs.sendMessage(message.tabId, message);
    }

    return;
  }

  port.onMessage.addListener(handleMessage);

  port.onDisconnect.addListener((port) => {
    port.onMessage.removeListener(handleMessage);

    for (const tabId of Object.keys(ports)) {
      if (ports[tabId] == port) {
        delete ports[tabId];
        break;
      }
    }
  });
});

browser.runtime.onMessage.addListener((message, sender) => {
  if (sender.tab) {
    const tabId = sender.tab.id;

    if (tabId in ports) {
      ports[tabId].postMessage(message);
    }
  }

  return;
});

export {};
