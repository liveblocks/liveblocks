"use client";

import { RoomProvider, useThreads } from "../../../liveblocks.config";
import { Loading } from "../../components/Loading";
import { Composer, Thread } from "@liveblocks/react-comments";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import { useRoomIdWithDocument } from "../../utils/ids";

function Example() {
  const { threads } = useThreads();

  return (
    <div className="threads">
      {threads.map((thread) => (
        <Thread key={thread.id} thread={thread} className="thread" />
      ))}
      <Composer className="composer" />
    </div>
  );
}

export default function Page({ params }: { params: { document: string } }) {
  const roomId = useRoomIdWithDocument(params.document);

  return (
    <RoomProvider id={roomId} initialPresence={{}}>
      <ErrorBoundary
        fallback={
          <div className="error">There was an error while getting threads.</div>
        }
      >
        <ClientSideSuspense fallback={<Loading />}>
          {() => <Example />}
        </ClientSideSuspense>
      </ErrorBoundary>
    </RoomProvider>
  );
}
