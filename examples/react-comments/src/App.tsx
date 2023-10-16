import { Suspense } from "react";
import { Composer, Thread } from "@liveblocks/react-comments";
import { RoomProvider, useThreads } from "../liveblocks.config";
import { Loading } from "./components/Loading";
import "@liveblocks/react-comments/styles.css";
import "@liveblocks/react-comments/styles/dark/media-query.css";

/**
 * Displays a list of threads, along with a composer for creating
 * new threads.
 */

function Example() {
  const { threads } = useThreads();

  return (
    <main>
      {threads.map((thread) => (
        <Thread key={thread.id} thread={thread} className="thread" />
      ))}
      <Composer className="composer" />
    </main>
  );
}

export default function App({ roomId }: { roomId: string }) {
  return (
    <RoomProvider id={roomId} initialPresence={{}}>
      <Suspense fallback={<Loading />}>
        <Example />
      </Suspense>
    </RoomProvider>
  );
}
