import { EXTENSION_ID } from "./constants";

window.addEventListener("message", (event) => {
  if (event.source !== window) {
    return;
  }

  const message = event.data;

  if (message?.source !== EXTENSION_ID) {
    return;
  }

  chrome.runtime.sendMessage(message);
});

chrome.runtime.onMessage.addListener((message) => {
  window.postMessage(
    {
      source: EXTENSION_ID,
      ...message,
    },
    "*"
  );

  return true;
});

export {};
