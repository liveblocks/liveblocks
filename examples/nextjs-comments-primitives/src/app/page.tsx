"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  RoomProvider,
  useCreateThread,
  useThreads,
} from "@liveblocks/react/suspense";
import { Loading } from "../components/Loading";
import { Composer } from "../components/Composer";
import { Thread } from "../components/Thread";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";

/**
 * Displays a list of threads, each allowing comment replies, along
 * with a composer for creating new threads.
 */

function Example() {
  const { threads } = useThreads();
  const createThread = useCreateThread();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16">
      {threads.map((thread) => (
        <Thread
          key={thread.id}
          thread={thread}
          className="rounded-xl bg-white shadow-md"
        />
      ))}
      <Composer
        onComposerSubmit={({ body, attachments }) => {
          createThread({
            body,
            attachments,
            commentMetadata: { userAgent: navigator.userAgent },
          });
        }}
        className="rounded-xl bg-white shadow-md"
      />
    </main>
  );
}

export default function Page() {
  const roomId = useExampleRoomId(
    "liveblocks:examples:nextjs-comments-primitives"
  );

  return (
    <RoomProvider id={roomId}>
      <ErrorBoundary
        fallback={
          <div className="absolute flex h-screen w-screen place-content-center items-center">
            There was an error while getting threads.
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
