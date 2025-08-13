"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider, useThreads } from "@liveblocks/react/suspense";
import { Loading } from "../components/Loading";
import { Composer, Thread } from "@liveblocks/react-ui";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";

/**
 * Displays a list of threads, along with a composer for creating
 * new threads.
 */

function Example() {
  const { threads } = useThreads();
  const [state, setState] = useState<"oldest" | "newest" | "both" | "off">(
    "newest"
  );

  return (
    <main style={{ maxWidth: "460px", margin: "0 auto" }}>
      <div style={{ display: "flex", gap: "8px", marginBottom: "" }}>
        <Button onClick={() => setState("newest")}>Show newest</Button>
        <Button onClick={() => setState("oldest")}>Show oldest</Button>
        <Button onClick={() => setState("both")}>Show both</Button>
        <Button onClick={() => setState("off")}>Off</Button>
      </div>
      {threads.map((thread) => (
        <Thread
          key={thread.id}
          thread={thread}
          className="thread"
          maxVisibleComments={{
            max: state === "off" ? 100000 : 4,
            show: state,
          }}
        />
      ))}
      <Composer className="composer" />
    </main>
  );
}

function Button({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="thread"
      style={{
        backgroundColor: "white",
        border: "0",
        padding: "8px 16px",
        borderRadius: "8px",
        fontFamily: "inherit",
        appearance: "none",
        cursor: "pointer",
        fontSize: "15px",
        fontWeight: "500",
      }}
    >
      {children}
    </button>
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
