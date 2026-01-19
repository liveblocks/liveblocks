"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider } from "@liveblocks/react/suspense";
import { Loading } from "../components/Loading";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import { LiveList, LiveObject } from "@liveblocks/client";
import { Grid } from "./grid";
import { nanoid } from "@liveblocks/core";

export default function Page() {
  const roomId = useExampleRoomId("liveblocks:examples:nextjs-ag-grid-new-3");

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ isEditing: false, focusedCell: null }}
      initialStorage={{
        rowData: new LiveList([
          new LiveObject({ id: nanoid(), make: "Tesla", model: "Model Y", price: 64950, electric: true }),
          new LiveObject({ id: nanoid(), make: "Ford", model: "F-Series", price: 33850, electric: false }),
          new LiveObject({ id: nanoid(), make: "Toyota", model: "Corolla", price: 29600, electric: false }),
        ])
      }}
    >
      <ErrorBoundary
        fallback={
          <div className="error">There was an error while getting threads.</div>
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
