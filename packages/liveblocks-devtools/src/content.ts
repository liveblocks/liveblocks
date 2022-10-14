import browser from "webextension-polyfill";
import type {
  FullPanelToClientMessage,
  FullClientToPanelMessage,
} from "@liveblocks/core";

window.addEventListener("message", (event) => {
  if (event.source !== window) {
    return;
  }

  const message = event.data;
  if (message?.source === "liveblocks-devtools-client") {
    // Relay messages from the client to the panel
    browser.runtime.sendMessage(message as FullClientToPanelMessage);
  }
});

browser.runtime.onMessage.addListener((message: FullPanelToClientMessage) => {
  if (message?.source === "liveblocks-devtools-panel") {
    window.postMessage(message, "*");
  }
});

export {};
