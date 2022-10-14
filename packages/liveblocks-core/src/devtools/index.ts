import { makeEventSource } from "../lib/EventSource";
import type {
  ClientToPanelMessage,
  FullPanelToClientMessage,
} from "./protocol";

export function sendToPanel(message: ClientToPanelMessage): void {
  const fullMsg = {
    ...message,
    source: "liveblocks-devtools-client",
  };

  window.postMessage(fullMsg, "*");
}

const eventSource = makeEventSource<FullPanelToClientMessage>();

if (typeof window !== "undefined") {
  window.addEventListener("message", (event) => {
    if (
      event.source === window &&
      event.data?.source === "liveblocks-devtools-panel"
    ) {
      eventSource.notify(event.data);
    } else {
      // Message not for us
    }
  });
}

export const onMessageFromPanel = eventSource.observable;
