import { makeEventSource } from "../lib/EventSource";
import type {
  ClientToPanelMessage,
  FullPanelToClientMessage,
} from "./protocol";

export function sendToPanel(message: ClientToPanelMessage): void {
  // Devtools communication only happens on the client side
  // Define it as a no-op in production environments or when run outside of a browser context
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return;
  }

  const fullMsg = {
    ...message,
    source: "liveblocks-devtools-client",
  };

  window.postMessage(fullMsg, "*");
}

const eventSource = makeEventSource<FullPanelToClientMessage>();

// Define it as a no-op in production environments or when run outside of a browser context
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
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
