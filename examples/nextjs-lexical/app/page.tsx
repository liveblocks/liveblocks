"use client";

import { LiveList, LiveObject, LiveText } from "@liveblocks/client";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import { useSearchParams } from "next/navigation";
import Editor from "./lexical/editor";
import Loading from "./loading";

// Learn how to structure your collaborative Next.js app
// https://liveblocks.io/docs/guides/how-to-use-liveblocks-with-nextjs-app-directory

export default function Page() {
  const roomId = useExampleRoomId("liveblocks:examples:nextjs-lexical");

  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      resolveUsers={async ({ userIds }) => {
        const searchParams = new URLSearchParams(
          userIds.map((userId) => ["userIds", userId])
        );
        const response = await fetch(`/api/users?${searchParams}`);

        if (!response.ok) {
          throw new Error("Problem resolving users");
        }

        const users = await response.json();
        return users;
      }}
    >
      <RoomProvider
        id={roomId}
        initialPresence={{
          selection: null,
        }}
        initialStorage={{
          document: new LiveObject({
            kind: "root",
            type: "root",
            version: 1,
            children: new LiveList([
              new LiveObject({
                kind: "element",
                type: "paragraph",
                version: 1,
                children: new LiveList([
                  new LiveObject({
                    kind: "text",
                    type: "text",
                    version: 1,
                    content: new LiveText(),
                  }),
                ]),
              }),
            ]),
          }),
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
