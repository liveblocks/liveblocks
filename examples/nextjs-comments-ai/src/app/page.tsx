"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  ClientSideSuspense,
  RoomProvider,
  useThreads,
} from "@liveblocks/react/suspense";
import { useFeedMessages } from "@liveblocks/react";
import { Loading } from "../components/Loading";
import { AvatarStack, Composer, Thread, Comment } from "@liveblocks/react-ui";
import { ErrorBoundary } from "react-error-boundary";
import { CommentData } from "@liveblocks/client";

/**
 * Displays a list of threads, along with a composer for creating
 * new threads.
 */

function Example() {
  const { threads } = useThreads();

  return (
    <>
      <main>
        <header>
          <AvatarStack size={36} />
        </header>
        {threads.map((thread) => (
          <Thread
            key={thread.id}
            thread={thread}
            className="thread"
            components={{
              Comment: ({ comment, ...props }) => {
                const feedId = comment.metadata.feedId;

                if (feedId) {
                  return <AiComment feedId={feedId} comment={comment} />;
                }

                return <Comment comment={comment} />;
              },
            }}
          />
        ))}
        <Composer className="composer" />
      </main>
    </>
  );
}

function AiComment({
  feedId,
  comment,
}: {
  feedId: string;
  comment: CommentData;
}) {
  const { messages } = useFeedMessages(feedId);
  const lastMessage = messages?.[messages.length - 1];

  if (!messages || !lastMessage) {
    return (
      <Comment comment={comment}>
        <Spinner /> Running…
      </Comment>
    );
  }

  if (lastMessage.data.stage === "thinking") {
    return (
      <Comment comment={comment}>
        <Spinner /> Thinking…
      </Comment>
    );
  }

  if (lastMessage.data.stage === "writing") {
    return (
      <Comment comment={comment}>
        <Spinner /> Writing…
      </Comment>
    );
  }

  return (
    <Comment comment={comment}>
      <div className="lb-comment-body">{lastMessage?.data.response}</div>
    </Comment>
  );
}

function Spinner() {
  return (
    <svg
      className="comments-ai-spinner"
      xmlns="http://www.w3.org/2000/svg"
      width={17}
      height={17}
      opacity={0.4}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 12a1 1 0 01-10 0 1 1 0 00-10 0" />
      <path d="M7 20.7a1 1 0 115-8.7 1 1 0 105-8.6" />
      <path d="M7 3.3a1 1 0 115 8.6 1 1 0 105 8.6" />
      <circle cx={12} cy={12} r={10} />
    </svg>
  );
}

export default function Page() {
  const roomId = useExampleRoomId("liveblocks:examples:nextjs-comments-ai");

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
