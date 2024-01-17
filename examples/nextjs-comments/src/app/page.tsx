"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  LiveblocksProvider,
  RoomProvider,
  useInboxNotifications,
  useThreads,
} from "../../liveblocks.config";
import { Loading } from "../components/Loading";
import {
  Composer,
  Thread,
  InboxNotification,
} from "@liveblocks/react-comments";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import { setCookie } from "tiny-cookie";

/**
 * Displays a list of threads, along with a composer for creating
 * new threads.
 */

function Example() {
  const { threads } = useThreads();

  return (
    <main>
      {threads.map((thread) => (
        <Thread key={thread.id} thread={thread} className="thread" />
      ))}
      <Composer className="composer" />
    </main>
  );
}

function Inbox() {
  const { inboxNotifications } = useInboxNotifications();

  return (
    <>
      {inboxNotifications.map((inboxNotification) => (
        <InboxNotification
          key={inboxNotification.id}
          inboxNotification={inboxNotification}
        />
      ))}
    </>
  );
}

export default function Page() {
  const roomId = useOverrideRoomId("nextjs-comments");
  useOverrideUserIndex();

  return (
    <>
      <LiveblocksProvider>
        <ClientSideSuspense fallback={<Loading />}>
          {() => <Inbox />}
        </ClientSideSuspense>
      </LiveblocksProvider>
      <RoomProvider id={roomId} initialPresence={{}}>
        <ErrorBoundary
          fallback={
            <div className="error">
              There was an error while getting threads.
            </div>
          }
        >
          <ClientSideSuspense fallback={<Loading />}>
            {() => <Example />}
          </ClientSideSuspense>
        </ErrorBoundary>
      </RoomProvider>
    </>
  );
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useOverrideRoomId(roomId: string) {
  const params = useSearchParams();
  const roomIdParam = params?.get("roomId");

  const overrideRoomId = useMemo(() => {
    return roomIdParam ? `${roomId}-${roomIdParam}` : roomId;
  }, [roomId, roomIdParam]);

  return overrideRoomId;
}

function useOverrideUserIndex() {
  const params = useSearchParams();
  const userIndexParam = params?.get("userIndex");

  useEffect(() => {
    if (!userIndexParam) {
      return;
    }

    setCookie("userIndex", userIndexParam, { expires: "1M" });
  }, [userIndexParam]);
}
