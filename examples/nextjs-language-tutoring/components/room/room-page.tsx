"use client";

import { LiveList, LiveMap } from "@liveblocks/client";
import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app-context";
import { FullPageSpinner } from "@/components/home/home-page";
import { SignIn } from "@/components/sign-in";
import { Button } from "@/components/ui/button";
import { ApiError, type LessonRoomDetails } from "@/lib/api";
import { RoomShell } from "./room-shell";

export function RoomPage({ roomId }: { roomId: string }) {
  const { user } = useApp();

  if (user === null) {
    return <FullPageSpinner />;
  }
  if (user === undefined) {
    return <SignIn />;
  }
  return <AuthorizedRoom roomId={roomId} />;
}

function AuthorizedRoom({ roomId }: { roomId: string }) {
  const { api, href, user } = useApp();
  const [room, setRoom] = useState<LessonRoomDetails | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(
    null
  );

  const refresh = useCallback(async () => {
    try {
      setRoom(
        await api<LessonRoomDetails>(`/api/rooms/${encodeURIComponent(roomId)}`)
      );
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? { status: cause.status, message: cause.message }
          : { status: 500, message: "Could not load the room" }
      );
    }
  }, [api, roomId]);

  useEffect(() => {
    void refresh();
  }, [refresh, user?.id]);

  if (error) {
    return (
      <main className="flex h-full min-h-full items-center justify-center p-6">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg bg-white p-6 text-center shadow ring-1 ring-neutral-950/5">
          <p className="font-medium">
            {error.status === 404
              ? "You don't have access to this room"
              : "Something went wrong"}
          </p>
          <p className="text-sm text-neutral-500">
            {error.status === 404
              ? "Ask the tutor for an invite link, or pick one of your rooms."
              : error.message}
          </p>
          <Button asChild variant="outline">
            <Link href={href("/")}>Back to your rooms</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (!room) {
    return <FullPageSpinner />;
  }

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ docId: null, tldraw: null }}
      initialStorage={{
        documents: new LiveList([]),
        whiteboards: new LiveMap(),
        files: new LiveMap(),
        snapshots: new LiveMap(),
        attachments: new LiveMap(),
      }}
    >
      <ClientSideSuspense fallback={<FullPageSpinner />}>
        <RoomShell room={room} onRoomChange={setRoom} refreshRoom={refresh} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
