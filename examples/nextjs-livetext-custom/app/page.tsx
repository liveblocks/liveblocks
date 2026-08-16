"use client";

import { LiveText } from "@liveblocks/client";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import { useSearchParams } from "next/navigation";
import { Editor } from "../components/editor";
import Loading from "./loading";

// Learn how to structure your collaborative Next.js app
// https://liveblocks.io/docs/guides/how-to-use-liveblocks-with-nextjs-app-directory

export default function Page() {
  const roomId = useExampleRoomId(
    "liveblocks:examples:nextjs-livetext-custom"
  );

  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      resolveUsers={async ({ userIds }) => {
        const searchParams = new URLSearchParams(
          userIds.map((userId) => ["userIds", userId])
        );
        const response = await fetch(`/api/users?${searchParams}`);

        if (!response.ok) {
          throw new Error("Problem resolving users");
        }

        return await response.json();
      }}
    >
      <RoomProvider
        id={roomId}
        initialPresence={{ selection: null }}
        initialStorage={{
          text: new LiveText([
            ["Hello world!", { bold: true }],
            [" Edit this text with others, and select some of it to change its formatting."],
          ]),
        }}
      >
        <ClientSideSuspense fallback={<Loading />}>
          <Editor />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
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
