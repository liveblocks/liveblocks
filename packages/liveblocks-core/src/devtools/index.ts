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

// export function onMessageFromPanel(message: FullPanelToClientMessage) {
//   switch (message.name) {
//     // case "double-this-number-plz": {
//     //   sendToPanel({
//     //     name: "answer",
//     //     value: Math.ceil(message.value) * 2,
//     //   });
//     //   break;
//     // }

//     default: {
//       console.error("Unknown message?", message);
//     }
//   }
// }
