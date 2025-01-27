"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { useSearchParams } from "next/navigation";

import Loading from "./_components/loading";

import Editor from "./tiptap/editor";
import { useExampleUserId } from "./use-example-user-id";

// Learn how to structure your collaborative Next.js app
// https://liveblocks.io/docs/guides/how-to-use-liveblocks-with-nextjs-app-directory

export default function Page() {
  const userId = useExampleUserId();
  const roomId = useExampleRoomId(
    "liveblocks:notifications-settings-examples:nextjs"
  );

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
      }}
    >
      <ClientSideSuspense fallback={<Loading />}>
        <Editor userId={userId} />
      </ClientSideSuspense>
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
  return exampleId ? `${roomId}-${exampleId}` : roomId;
}
