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
import {
  AvatarStack,
  Composer,
  Thread,
  Comment,
  AiTool,
} from "@liveblocks/react-ui";
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

                return (
                  <Comment className="lb-thread-comment" comment={comment} />
                );
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
      <Comment className="lb-thread-comment" comment={comment}>
        <Brain /> <span className="lb-ai-chat-pending">Running…</span>
      </Comment>
    );
  }

  if (lastMessage.data.stage === "thinking") {
    return (
      <Comment className="lb-thread-comment" comment={comment}>
        <Brain /> <span className="lb-ai-chat-pending">Thinking…</span>
      </Comment>
    );
  }

  if (lastMessage.data.stage === "writing") {
    return (
      <Comment className="lb-thread-comment" comment={comment}>
        <Brain /> <span className="lb-ai-chat-pending">Writing…</span>
      </Comment>
    );
  }

  return (
    <Comment className="lb-thread-comment" comment={comment}>
      <div className="lb-comment-body">{lastMessage?.data.response}</div>
    </Comment>
  );
}

function Brain() {
  return (
    <svg
      className="comments-ai-spinner"
      xmlns="http://www.w3.org/2000/svg"
      width={17}
      height={17}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 18V5M15 13a4.17 4.17 0 01-3-4 4.17 4.17 0 01-3 4M17.598 6.5A3 3 0 1012 5a3 3 0 10-5.598 1.5M17.997 5.125a4 4 0 012.526 5.77M18 18a4 4 0 002-7.464" />
      <path d="M19.967 17.483A4 4 0 1112 18a4 4 0 11-7.967-.517M6 18a4 4 0 01-2-7.464M6.003 5.125a4 4 0 00-2.526 5.77" />
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
