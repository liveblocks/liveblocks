"use client";

import { LiveList, LiveObject, LiveText } from "@liveblocks/client";
import { RoomProvider } from "@liveblocks/react/suspense";
import { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { getRoomId } from "../config";

export function Room({
  pageId,
  children,
}: {
  pageId: string;
  children: ReactNode;
}) {
  const roomId = useExampleRoomId(getRoomId(pageId));

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        selection: null,
      }}
      initialStorage={{
        title: "Untitled document",
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
      {children}
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
