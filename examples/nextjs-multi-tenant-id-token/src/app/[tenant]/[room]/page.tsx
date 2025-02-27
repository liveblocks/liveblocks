"use client";

import { RoomProvider } from "@liveblocks/react/suspense";
import { Loading } from "../../../components/Loading";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import { useExampleRoomId } from "../../../example.client";
import { Suspense } from "react";
import { useManageRoom } from "../../../hooks/useManageRoom";
import { usePathParams } from "../../../hooks/usePathParams";

function RoomManagement({ roomId }: { roomId: string }) {
  const { inviteUser, room } = useManageRoom(roomId);
  const { tenant } = usePathParams();

  // TODO: Invite users, toggle private, remove user
  // TODO: display who has access and if it's private

  if (!room) {
    return <Loading />;
  }

  return (
    <div className="room-management">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target as HTMLFormElement);
          const email = formData.get("email") as string;
          inviteUser({ roomId, userId: email, tenantId: tenant });
        }}
      >
        <input type="text" name="email" />
        <button type="submit">Invite User</button>
      </form>
    </div>
  );
}

function Room({ room }: { room: string }) {
  const roomId = useExampleRoomId(room);

  return (
    <RoomProvider id={roomId}>
      <ErrorBoundary
        fallback={
          <div className="error">There was an error while getting threads.</div>
        }
      >
        <ClientSideSuspense fallback={<Loading />}>
          <RoomManagement roomId={roomId} />
          {/* <Example /> */}
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
