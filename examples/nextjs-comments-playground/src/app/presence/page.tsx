"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider } from "@liveblocks/react/suspense";
import { ClientSideSuspense } from "@liveblocks/react";
import { AvatarStack } from "@liveblocks/react-ui";
import { Loading } from "../../components/Loading";
import { ErrorBoundary } from "react-error-boundary";

function Presence() {
  return (
    <main className="min-h-screen max-w-none py-0 gap-0 flex flex-col">
      <header className="fixed top-0 left-0 right-0 flex items-center justify-between py-4 px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-lg text-gray-900 dark:text-white">Presence</h1>
        <AvatarStack />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 pt-16">
        <AvatarStack className="[--lb-avatar-stack-size:48px]" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Open this page in multiple tabs to see presence
        </p>
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
          <div className="absolute inset-0 w-screen h-screen flex place-content-center place-items-center text-gray-900 dark:text-white">
            There was an error while connecting.
          </div>
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
