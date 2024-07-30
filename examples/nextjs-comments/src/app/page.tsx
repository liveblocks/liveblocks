"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function Example(props: { ref: React.RefObject<HTMLDivElement> }) {
  const { threads } = useThreads();

  return (
    <main ref={props.ref}>
      {threads.map((thread) => (
        <Thread key={thread.id} thread={thread} className="thread" />
      ))}
      <Composer className="composer" disabled={false}/>
    </main>
  );
}

export default function Page() {
  // 10 rooms are created for the example
  const [numberOfExamples, setNumberOfExamples] = useState(10);

  const [exampleIds, setExampleIds] = useState(() =>
    Array.from({ length: numberOfExamples }, (_, i) => i)
  );

  useEffect(() => {
    setExampleIds((exampleIds) => [
      ...exampleIds,
      ...Array.from({ length: numberOfExamples - exampleIds.length }, (_, i) =>
        exampleIds.length + i
      ),
    ]);
  }, [numberOfExamples]);

  return (
    <div>
      {exampleIds.map((exampleId) => (
        <Room key={exampleId} exampleId={exampleId.toString()} />
      ))}
      {/* Load more button */}
      <button
        className="load-more"
        onClick={() => setNumberOfExamples(numberOfExamples + 10)}
      >
        Load more
      </button>
    </div>
  );
}

function Room(props: { roomId?: string; exampleId?: string }) {
  // const roomId = useExampleRoomId("liveblocks:examples:nextjs-comments");
  const roomId =
    props.roomId ?? props.exampleId
      ? `liveblocks:examples:nextjs-comments:${props.exampleId}`
      : "liveblocks:examples:nextjs-comments";
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(ref);

  useEffect(() => {
    console.log("exampleId", props.exampleId,"isVisible", isVisible);
  }, [isVisible]);

  return (    
    <RoomProvider 
      id={roomId} 
      autoConnect={false} 
      // enablePolling={true} 
      
    >
      <ErrorBoundary
        fallback={
          <div className="error">There was an error while getting threads.</div>
        }
      >
        <ClientSideSuspense fallback={<Loading />}>
          <Example ref={ref}/>
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


export function useIsVisible(ref: React.RefObject<Element>): boolean {
  const [isIntersecting, setIntersecting] = useState<boolean>(false);

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) =>
      setIntersecting(entry.isIntersecting)
    );

    observer.observe(ref.current!);
    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return isIntersecting;
}