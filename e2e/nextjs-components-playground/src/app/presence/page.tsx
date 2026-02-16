"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  RoomProvider,
  useOthers,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { ClientSideSuspense } from "@liveblocks/react";
import { AvatarStack, Cursor } from "@liveblocks/react-ui";
import { Loading } from "../../components/Loading";
import { ErrorBoundary } from "react-error-boundary";

function Cursors() {
  const updateMyPresence = useUpdateMyPresence();
  const others = useOthers((others) => others);

  return (
    <div
      className="absolute inset-0"
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        updateMyPresence({
          cursor: {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          },
        });
      }}
      onPointerLeave={() => {
        updateMyPresence({ cursor: null });
      }}
    >
      {others.map((other) => {
        const cursor = other.presence.cursor;

        if (!cursor) {
          return null;
        }

        return (
          <Cursor
            key={other.connectionId}
            label={other.info.name ?? "Anonymous"}
            color={other.info.color}
            className="absolute"
            style={{
              transform: `translate(${cursor.x}px, ${cursor.y}px)`,
              transition: "transform 0.05s ease-out",
            }}
          />
        );
      })}
    </div>
  );
}

function Presence() {
  return (
    <main className="min-h-screen max-w-none py-0 gap-0 flex flex-col">
      <header className="flex items-center justify-between py-4 px-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            ← Home
          </Link>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Presence
          </h1>
        </div>
        <AvatarStack />
      </header>

      <div className="flex-1 flex relative">
        <Cursors />

        <div className="flex-1 flex flex-col items-center justify-center gap-12">
          <Cursor />
          <Cursor label="Stacy" color="oklch(76.8% 0.233 130.85)" />
          <Cursor
            label="Chris"
            className="[--lb-cursor-color:var(--color-rose-500)]!"
          />
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  const roomId = useExampleRoomId(
    "liveblocks:examples:nextjs-components-playground-presence"
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
