import {
  useBroadcastEvent,
  useEventListener,
} from "@liveblocks/react/suspense";
import { useToast } from "./useToast";

export function Room() {
  const toast = useToast();

  // Broadcast event hook
  const broadcast = useBroadcastEvent();

  // Listen for incoming events
  useEventListener(({ event }) => {
    if (event.type === "TOAST") {
      toast(event.message);
    }
  });

  return (
    <button
      onClick={() =>
        // Broadcast toast event
        broadcast({ type: "TOAST", message: "Event received!" })
      }
    >
      Broadcast event
    </button>
  );
}
