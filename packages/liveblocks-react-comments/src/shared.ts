import { kInternal, raise } from "@liveblocks/core";
import {
  useLiveblocksContextBundleOrNull__,
  useRoomContextBundleOrNull__,
} from "@liveblocks/react";

export function useCurrentUserId(): string | null {
  const roomContextBundle = useRoomContextBundleOrNull__();
  const liveblocksContextBundle = useLiveblocksContextBundleOrNull__();

  if (roomContextBundle !== null) {
    return roomContextBundle[kInternal].useCurrentUserIdFromRoom();
  } else if (liveblocksContextBundle !== null) {
    return liveblocksContextBundle[kInternal].useCurrentUserIdFromClient();
  } else {
    raise(
      "LiveblocksProvider or RoomProvider are missing from the React tree."
    );
  }
}
