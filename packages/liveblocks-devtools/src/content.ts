import browser from "webextension-polyfill";
import { EXTENSION_ID } from "./constants";

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

browser.runtime.onMessage.addListener((message) => {
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
