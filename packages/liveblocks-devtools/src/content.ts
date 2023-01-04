import type { DevTools } from "@liveblocks/core";
import type { PlasmoContentScript } from "plasmo";
import browser from "webextension-polyfill";

window.addEventListener("message", (event) => {
  if (event.source !== window) {
    return;
  }

  const message = event.data;
  if (message?.source === "liveblocks-devtools-client") {
    // Relay messages from the client to the panel
    browser.runtime.sendMessage(message as DevTools.FullClientToPanelMessage);
  }
});

browser.runtime.onMessage.addListener(
  (message: DevTools.FullPanelToClientMessage) => {
    if (message?.source === "liveblocks-devtools-panel") {
      window.postMessage(message, "*");
    }
  }
);

export const config: PlasmoContentScript = {
  matches: ["<all_urls>"],
  all_frames: true,
};
