"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider } from "@liveblocks/react/suspense";
import { Loading } from "../../components/Loading";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import { Grid } from "./grid";
import { createDefaultRowData } from "./defaultTableData";

export default function Page() {
  const roomId = useExampleRoomId(
    "liveblocks:examples:nextjs-comments-playground-ag-grid"
  );

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ isEditing: false, focusedCell: null }}
      initialStorage={{
        rowData: createDefaultRowData(),
      }}
    >
      <ErrorBoundary
        fallback={
          <div className="absolute inset-0 w-screen h-screen flex place-content-center place-items-center text-gray-900 dark:text-white">
            There was an error while getting threads.
          </div>
        }
      >
        <ClientSideSuspense fallback={<Loading />}>
          <Grid />
        </ClientSideSuspense>
      </ErrorBoundary>
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

  const exampleRoomId = useMemo(() => {
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [roomId, exampleId]);

  return exampleRoomId;
}
