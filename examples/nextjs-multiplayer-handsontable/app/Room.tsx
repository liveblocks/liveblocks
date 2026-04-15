"use client";

import { LiveList } from "@liveblocks/client";
import { ReactNode, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";
import { Loading } from "./Loading";
import {
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  GRID_COLS,
  GRID_ROWS,
} from "../liveblocks.config";

export function Room({ children }: { children: ReactNode }) {
  const roomId = useExampleRoomId(
    "liveblocks:examples:nextjs-multiplayer-handsontable"
  );

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ selectedCell: null }}
      initialStorage={{
        // Create an empty grid with the dimensions of the spreadsheet
        grid: new LiveList(
          Array.from(
            { length: GRID_ROWS },
            () => new LiveList(Array.from({ length: GRID_COLS }, () => ""))
          )
        ),
        columnWidths: new LiveList(
          Array.from({ length: GRID_COLS }, () => DEFAULT_COL_WIDTH)
        ),
        rowHeights: new LiveList(
          Array.from({ length: GRID_ROWS }, () => DEFAULT_ROW_HEIGHT)
        ),
      }}
    >
      <ClientSideSuspense fallback={<Loading />}>{children}</ClientSideSuspense>
    </RoomProvider>
  );
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useExampleRoomId(roomId: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");

  return useMemo(() => {
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [roomId, exampleId]);
}
