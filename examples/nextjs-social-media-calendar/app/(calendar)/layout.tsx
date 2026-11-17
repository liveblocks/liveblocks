"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import type { ReactNode } from "react";
import { CalendarApp } from "@/components/calendar-app";
import { Loading } from "@/components/loading";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import { createInitialStorage } from "@/lib/posts";

/**
 * The calendar and the posts share one layout: the project room, with every
 * post's metadata and who's editing what, and the calendar itself. `/` shows
 * just the calendar; `/post/[postId]` renders on top of it as a dialog
 * (`children`), so a post has a URL of its own and the calendar behind it
 * keeps its place.
 */
export default function CalendarLayout({ children }: { children: ReactNode }) {
  const roomId = useExampleRoomId();

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ editingPostId: null }}
      initialStorage={createInitialStorage}
    >
      <ClientSideSuspense fallback={<Loading />}>
        <CalendarApp />
        {children}
      </ClientSideSuspense>
    </RoomProvider>
  );
}
