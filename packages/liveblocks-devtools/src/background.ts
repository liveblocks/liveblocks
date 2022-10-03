import { PORT_INITIAL_EVENT } from "./constants";

const ports: Record<string | number, chrome.runtime.Port> = {};

interface Message {
  name: string;
  tabId: number;
}

chrome.runtime.onConnect.addListener((port) => {
  function handleMessage(message: Message) {
    if (message.name == PORT_INITIAL_EVENT) {
      ports[message.tabId] = port;
    } else {
      chrome.tabs.sendMessage(message.tabId, message);
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

chrome.runtime.onMessage.addListener((message, sender) => {
  if (sender.tab) {
    const tabId = sender.tab.id;

    if (tabId in ports) {
      ports[tabId].postMessage(message);
    }
  }

  return true;
});

export {};
