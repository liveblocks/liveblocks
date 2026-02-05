"use client";

import { CSSProperties, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider } from "@liveblocks/react/suspense";
import { ClientSideSuspense } from "@liveblocks/react";
import { AvatarStack } from "@liveblocks/react-ui";
import { Loading } from "../../components/Loading";
import { ErrorBoundary } from "react-error-boundary";

function Presence() {
  return (
    <main className="presence-page">
      <header className="presence-toolbar">
        <h1>Presence Demo</h1>
        <AvatarStack />
      </header>

      <div className="presence-content">
        <AvatarStack
          style={{ "--lb-avatar-stack-size": "48px" } as CSSProperties}
        />
        <p className="hint">Open this page in multiple tabs to see presence</p>
      </div>
    </main>
  );
}

export default function Page() {
  const roomId = useExampleRoomId(
    "liveblocks:examples:nextjs-comments-playground-presence"
  );

  return (
    <RoomProvider id={roomId}>
      <ErrorBoundary
        fallback={
          <div className="error">There was an error while connecting.</div>
        }
      >
        <ClientSideSuspense fallback={<Loading />}>
          <Presence />
        </ClientSideSuspense>
      </ErrorBoundary>
    </RoomProvider>
  );
}

function useExampleRoomId(roomId: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");

  const exampleRoomId = useMemo(() => {
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [roomId, exampleId]);

  return exampleRoomId;
}
