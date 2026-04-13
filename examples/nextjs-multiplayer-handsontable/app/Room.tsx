"use client";

import { LiveList } from "@liveblocks/client";
import { ReactNode, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";
import { Loading } from "./Loading";
import { GRID_COLS, GRID_ROWS } from "../liveblocks.config";

function createEmptyGrid(): LiveList<LiveList<string>> {
  return new LiveList(
    Array.from({ length: GRID_ROWS }, () =>
      new LiveList(Array.from({ length: GRID_COLS }, () => ""))
    )
  );
}

function createInitialStorage(): Liveblocks["Storage"] {
  return {
    grid: createEmptyGrid(),
  };
}

export function Room({ children }: { children: ReactNode }) {
  const roomId = useExampleRoomId(
    "liveblocks:examples:nextjs-multiplayer-handsontable-grid"
  );

  const initialStorage = useMemo(() => createInitialStorage(), []);

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{}}
      initialStorage={initialStorage}
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
