import { EXTENSION_ID, PORT_INITIAL_EVENT } from "./constants";

export const port = chrome.runtime.connect({
  name: EXTENSION_ID,
});

port.postMessage({
  name: PORT_INITIAL_EVENT,
  tabId: chrome.devtools.inspectedWindow.tabId,
});
