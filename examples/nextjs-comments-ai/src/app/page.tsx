"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  ClientSideSuspense,
  RoomProvider,
  useThreads,
  useFeeds,
  useFeedMessages,
} from "@liveblocks/react/suspense";
import { Loading } from "../components/Loading";
import { AvatarStack, Composer, Thread, Comment } from "@liveblocks/react-ui";
import { Feed } from "@liveblocks/core";
import { ErrorBoundary } from "react-error-boundary";
import { AI_USER_INFO } from "../database";
import { CommentData } from "@liveblocks/client";

/**
 * Displays a list of threads, along with a composer for creating
 * new threads.
 */

function Example() {
  const { threads } = useThreads();
  const { feeds } = useFeeds({ metadata: { type: "ai-comment-reply" } });

  console.log(threads, feeds);

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
                  return (
                    <ClientSideSuspense
                      fallback={<Comment comment={comment}>Running…</Comment>}
                    >
                      <AiComment feedId={feedId} comment={comment} />
                    </ClientSideSuspense>
                  );
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
  const lastMessage = messages[messages.length - 1];

  console.log(messages, lastMessage);

  if (lastMessage?.data.stage === "thinking") {
    return <Comment comment={comment}>Thinking…</Comment>;
  }

  if (lastMessage?.data.stage === "writing") {
    return <Comment comment={comment}>Writing…</Comment>;
  }

  return (
    <Comment comment={comment}>
      <div className="lb-comment-body">{lastMessage?.data.response}</div>
    </Comment>
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
