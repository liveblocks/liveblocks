import browser from "webextension-polyfill";
import type { PanelToClientMessage } from "./lib/types";

const EXTENSION_ID = "liveblocks-devtools";

window.addEventListener("message", (event) => {
  if (event.source !== window) {
    return;
  }

  const message = event.data;

  if (message?.source !== EXTENSION_ID) {
    return;
  }

  browser.runtime.sendMessage(message);
});

browser.runtime.onMessage.addListener((message: PanelToClientMessage) => {
  window.postMessage(
    {
      source: EXTENSION_ID,
      ...message,
    },
    "*"
  );

  return;
});

export {};
