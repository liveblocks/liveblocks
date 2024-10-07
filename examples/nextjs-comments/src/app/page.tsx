"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider, useThreads } from "@liveblocks/react/suspense";
import { Loading } from "../components/Loading";
import { Composer, Thread } from "@liveblocks/react-ui";
import { ClientSideSuspense, useRoom } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";

/**
 * Displays a list of threads, along with a composer for creating
 * new threads.
 */

function Example() {
  const { threads } = useThreads();
  const room = useRoom();

  return (
    <main>
      {threads.map((thread) => (
        <Thread
          key={thread.id}
          thread={thread}
          className="thread"
          onAttachmentClick={async (attachment, event) => {
            event.preventDefault();
            // console.log(attachment);
            // const blob = await room.downloadAttachment(
            //   attachment.attachment.id
            // );
            // download(URL.createObjectURL(blob), attachment.attachment.name);

            // const url = await room.getAttachmentDownloadUrl(
            //   attachment.attachment.id
            // );
            // console.log(url);
            // window.open(url, "_blank");

            const urlPresigned = await room.getAttachmentDownloadPresignedUrl(
              attachment.attachment.id
            );

            console.log(urlPresigned);
          }}
        />
      ))}
      <Composer className="composer" />
    </main>
  );
}

export default function Page() {
  const roomId = useExampleRoomId("liveblocks:examples:nextjs-comments");

  return (
    <RoomProvider id={roomId}>
      <ErrorBoundary
        fallback={
          <div className="error">There was an error while getting threads.</div>
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

export function download(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.style.display = "none";

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
