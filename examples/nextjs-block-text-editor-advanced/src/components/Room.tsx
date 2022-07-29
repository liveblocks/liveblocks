import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { RoomProvider } from "../liveblocks.config";
import { BlockProps, DocumentMeta } from "../types";
import DocumentLoader from "./DocumentLoader";

export default function Room() {
  const roomId = useOverrideRoomId("nextjs-block-text-editor");

  if (!roomId) {
    return null;
  }

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        selectedBlockIds: [],
        textSelection: null,
      }}
      initialStorage={{
        meta: new LiveObject<DocumentMeta>({
          title: null,
        }),
        blocks: new LiveMap<string, LiveObject<BlockProps>>(),
        blockIds: new LiveList(),
      }}
    >
      <DocumentLoader />
    </RoomProvider>
  );
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useOverrideRoomId(roomId: string) {
  const { query } = useRouter();
  const overrideRoomId = useMemo(() => {
    return query?.roomId ? `${roomId}-${query.roomId}` : roomId;
  }, [query, roomId]);

  return overrideRoomId;
}
