"use client";

import { LiveMap, LiveText } from "@liveblocks/client";
import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { Suspense } from "react";
import { CodeWorkspace } from "@/components/code-workspace";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import { PROJECT_FILES } from "./project";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Example />
    </Suspense>
  );
}

function Example() {
  const roomId = useExampleRoomId();

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ selection: null }}
      // Seeds the room the first time it is created: every project file
      // becomes a LiveText document in Storage.
      initialStorage={() => ({
        files: new LiveMap(
          PROJECT_FILES.map(({ path, contents }) => [
            path,
            new LiveText(contents),
          ])
        ),
      })}
    >
      <ClientSideSuspense fallback={<Loading />}>
        <CodeWorkspace />
      </ClientSideSuspense>
    </RoomProvider>
  );
}

function Loading() {
  return (
    <div className="flex h-dvh items-center justify-center bg-neutral-50">
      <img
        className="size-16 opacity-20"
        src="https://liveblocks.io/loading.svg"
        alt="Loading"
      />
    </div>
  );
}
