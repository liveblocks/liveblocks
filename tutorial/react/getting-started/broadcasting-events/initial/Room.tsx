import {
  useBroadcastEvent,
  useEventListener,
} from "@liveblocks/react/suspense";
import { useToast } from "./useToast";

export function Room() {
  const toast = useToast();

  // Broadcast event hook

  // Listen for incoming events

  return (
    <button
      onClick={() => {
        // Broadcast toast event
      }}
    >
      Broadcast event
    </button>
  );
}
