import { makeEventSource } from "../lib/EventSource";
import type * as DevTools from "./protocol";

type SendToPanelOptions = {
  /**
   * We'll only want to send messages from the client to the panel if the panel
   * has shown interest in this. To allow message passing to the dev panel,
   * call allowMessagePassing().
   */
  force: boolean;
};

let _bridgeActive = false;
export function activateBridge(allowed: boolean): void {
  _bridgeActive = allowed;
}

export function sendToPanel(
  message: DevTools.ClientToPanelMessage,
  options?: SendToPanelOptions
): void {
  // DevTools communication only happens on the client side
  // Define it as a no-op in production environments or when run outside of a browser context
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return;
  }

  const fullMsg = {
    ...message,
    source: "liveblocks-devtools-client",
  };

  if (!(options?.force || _bridgeActive)) {
    // eslint-disable-next-line rulesdir/console-must-be-fancy
    // console.log(
    //   "%c[client → panel] %c%s",
    //   "color: green",
    //   "color: gray; font-weight: bold",
    //   fullMsg.msg,
    //   "[🚫 NOT sent!]"
    // );
    return;
  }

  // eslint-disable-next-line rulesdir/console-must-be-fancy
  // console.log(
  //   "%c[client → panel] %c%s",
  //   "color: green",
  //   "color: green; font-weight: bold",
  //   fullMsg.msg,
  //   fullMsg
  // );
  window.postMessage(fullMsg, "*");
}

const eventSource = makeEventSource<DevTools.FullPanelToClientMessage>();

// Define it as a no-op in production environments or when run outside of a browser context
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  window.addEventListener("message", (event) => {
    if (
      event.source === window &&
      event.data?.source === "liveblocks-devtools-panel"
    ) {
      // console.log(
      //   "%c[client ← panel] %c%s",
      //   "color: purple",
      //   "color: purple; font-weight: bold",
      //   event.data.msg,
      //   event.data
      // );
      eventSource.notify(event.data);
    } else {
      // Message not for us
    }
  });
}

export const onMessageFromPanel = eventSource.observable;
