"use client";

import { RoomProvider } from "@liveblocks/react/suspense";
import { Loading } from "../../../components/Loading";
import { ClientSideSuspense } from "@liveblocks/react";
import { useThreads } from "@liveblocks/react/suspense";

import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import { useTenants } from "../../../hooks/useTenants";
import { Composer } from "@liveblocks/react-ui";
import { Thread } from "@liveblocks/react-ui";
import { useManageRoom } from "../../../hooks/useManageRoom";
import { getUserId } from "../../../example";

function Example() {
  const { threads } = useThreads();

  return (
    <div className="threads">
      {threads?.map((thread) => (
        <Thread key={thread.id} thread={thread} className="thread" />
      ))}
      <Composer className="composer" />
    </div>
  );
}

function Room({ room }: { room: string }) {
  const { activeTenant } = useTenants();
  const roomId = `${activeTenant?.id}:${room}`;
  return (
    <RoomProvider id={roomId}>
      <ErrorBoundary
        fallback={
          <div>
            <CreateRoom roomId={roomId} />
            <div className="error">
              There was an error while getting threads.
            </div>
          </div>
        }
      >
        <ClientSideSuspense fallback={<Loading />}>
          <Example />
        </ClientSideSuspense>
      </ErrorBoundary>
    </RoomProvider>
  );
}

export default function Page({ params }: { params: { room: string } }) {
  return (
    <Suspense fallback={<Loading />}>
      <Room room={params.room} />
    </Suspense>
  );
}

function CreateRoom({ roomId }: { roomId: string }) {
  const { createRoom } = useManageRoom(roomId);
  const { activeTenant } = useTenants();
  const userId = getUserId();

  if (!activeTenant) {
    return null;
  }

  return (
    <div>
      <button
        className="button"
        onClick={() =>
          createRoom({
            roomId,
            tenantId: activeTenant.id,
            isPrivate: false,
          })
        }
      >
        Create tenant room
      </button>
      <button
        className="button"
        onClick={() =>
          createRoom({
            roomId,
            tenantId: activeTenant.id,
            isPrivate: true,
            userId,
          })
        }
      >
        Create private room
      </button>
    </div>
  );
}
