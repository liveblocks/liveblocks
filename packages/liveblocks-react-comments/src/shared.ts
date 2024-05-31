import { raise } from "@liveblocks/core";
import {
  useLiveblocksContextBundleOrNull,
  useRoomContextBundleOrNull,
} from "@liveblocks/react";

export function useSharedContextBundle() {
  const roomContextBundle = useRoomContextBundleOrNull();
  const liveblocksContextBundle = useLiveblocksContextBundleOrNull();

  if (roomContextBundle !== null) {
    return roomContextBundle;
  } else if (liveblocksContextBundle !== null) {
    return liveblocksContextBundle;
  } else {
    raise(
      "LiveblocksProvider or RoomProvider are missing from the React tree."
    );
  }
}
