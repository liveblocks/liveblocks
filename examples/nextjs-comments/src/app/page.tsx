"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider, useThreads } from "../../liveblocks.config";
import { Loading } from "../components/Loading";
import {
  Composer,
  Thread,
  InboxNotification,
} from "@liveblocks/react-comments";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import { setCookie } from "tiny-cookie";
import { InboxNotificationData } from "@liveblocks/client";

const inboxNotificationA: InboxNotificationData = {
  kind: "thread",
  id: "in_I8pEUZU5ZRN4wxd4pcYVs",
  threadId: "th_bdqY2mZelGglyljNvSEP2",
  readAt: new Date("2023-12-07T10:07:15.201Z"),
  notifiedAt: new Date("2023-12-10T10:07:15.201Z"),
  thread: {
    type: "thread",
    id: "th_5ssRcW7YInDt6nbU_xr4D",
    roomId: "nextjs-comments",
    comments: [
      {
        type: "comment",
        threadId: "th_5ssRcW7YInDt6nbU_xr4D",
        roomId: "nextjs-comments",
        id: "cm_5iocqEdxNx-HG3m-ZBJwo",
        userId: "user-7",
        createdAt: new Date("2023-12-06T10:07:15.201Z"),
        reactions: [],
        body: {
          version: 1,
          content: [
            {
              type: "paragraph",
              children: [
                {
                  text: "Hello world",
                },
              ],
            },
          ],
        },
      },
      {
        type: "comment",
        threadId: "th_5ssRcW7YInDt6nbU_xr4D",
        roomId: "nextjs-comments",
        id: "cm_5iocqEdxNx-HG3m-ZBJwd",
        userId: "user-8",
        createdAt: new Date("2023-12-08T10:07:15.201Z"),
        reactions: [],
        body: {
          version: 1,
          content: [
            {
              type: "paragraph",
              children: [
                {
                  text: "Hello world",
                },
              ],
            },
          ],
        },
      },
      {
        type: "comment",
        threadId: "th_5ssRcW7YInDt6nbU_xr4D",
        roomId: "nextjs-comments",
        id: "cm_5iocqEdxNx-HG3m-ZBJwa",
        userId: "user-9",
        createdAt: new Date("2023-12-10T10:07:15.201Z"),
        reactions: [],
        body: {
          version: 1,
          content: [
            {
              type: "paragraph",
              children: [
                {
                  text: "Hello world",
                },
              ],
            },
          ],
        },
      },
    ],
    createdAt: new Date("2023-12-06T10:07:15.201Z"),
    metadata: {},
    updatedAt: new Date("2023-12-10T10:07:15.201Z"),
  },
};

const inboxNotificationB: InboxNotificationData = {
  kind: "thread",
  id: "in_I8pEUZU5ZRN4wxd4pcYVs",
  threadId: "th_bdqY2mZelGglyljNvSEP2",
  readAt: new Date("2023-12-10T10:07:15.201Z"),
  notifiedAt: new Date("2023-12-10T10:07:15.201Z"),
  thread: {
    type: "thread",
    id: "th_5ssRcW7YInDt6nbU_xr4D",
    roomId: "nextjs-comments",
    comments: [
      {
        type: "comment",
        threadId: "th_5ssRcW7YInDt6nbU_xr4D",
        roomId: "nextjs-comments",
        id: "cm_5iocqEdxNx-HG3m-ZBJwo",
        userId: "user-7",
        createdAt: new Date("2023-12-06T10:07:15.201Z"),
        reactions: [],
        body: {
          version: 1,
          content: [
            {
              type: "paragraph",
              children: [
                {
                  text: "Hello world",
                },
              ],
            },
          ],
        },
      },
      {
        type: "comment",
        threadId: "th_5ssRcW7YInDt6nbU_xr4D",
        roomId: "nextjs-comments",
        id: "cm_5iocqEdxNx-HG3m-ZBJwd",
        userId: "user-8",
        createdAt: new Date("2023-12-08T10:07:15.201Z"),
        reactions: [],
        body: {
          version: 1,
          content: [
            {
              type: "paragraph",
              children: [
                {
                  text: "Hello world",
                },
              ],
            },
          ],
        },
      },
      {
        type: "comment",
        threadId: "th_5ssRcW7YInDt6nbU_xr4D",
        roomId: "nextjs-comments",
        id: "cm_5iocqEdxNx-HG3m-ZBJwa",
        userId: "user-9",
        createdAt: new Date("2023-12-10T10:07:15.201Z"),
        reactions: [],
        body: {
          version: 1,
          content: [
            {
              type: "paragraph",
              children: [
                {
                  text: "Hello world",
                },
              ],
            },
          ],
        },
      },
    ],
    createdAt: new Date("2023-12-06T10:07:15.201Z"),
    metadata: {},
    updatedAt: new Date("2023-12-10T10:07:15.201Z"),
  },
};

/**
 * Displays a list of threads, along with a composer for creating
 * new threads.
 */

function Example() {
  const { threads } = useThreads();

  return (
    <main>
      <InboxNotification inboxNotification={inboxNotificationA} />
      <InboxNotification inboxNotification={inboxNotificationB} />
      {threads.map((thread) => (
        <Thread key={thread.id} thread={thread} className="thread" />
      ))}
      <Composer className="composer" />
    </main>
  );
}

export default function Page() {
  const roomId = useOverrideRoomId("nextjs-comments");
  useOverrideUserIndex();

  return (
    <>
      {/* <ClientSideSuspense fallback={<Loading />}>
        {() => (
          <>
            <InboxNotification inboxNotification={inboxNotificationA} />
            <InboxNotification inboxNotification={inboxNotificationB} />
          </>
        )}
      </ClientSideSuspense> */}
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
