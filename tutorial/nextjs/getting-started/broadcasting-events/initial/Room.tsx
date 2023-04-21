import { useBroadcastEvent } from "./liveblocks.config";
import { useToast } from "./useToast";

export function Room() {
  const toast = useToast();

  return (
    <>
      <button onClick={() => toast("Event has been broadcast")}>
        Broadcast event
      </button>
      hello page
    </>
  );
}
