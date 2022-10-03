import browser from "webextension-polyfill";
import { EXTENSION_ID, PORT_INITIAL_EVENT } from "./constants";

export const port = browser.runtime.connect({
  name: EXTENSION_ID,
});

port.postMessage({
  name: PORT_INITIAL_EVENT,
  tabId: browser.devtools.inspectedWindow.tabId,
});
