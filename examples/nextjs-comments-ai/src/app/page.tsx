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
  const { feeds } = useFeeds();

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
                const aiComment = comment.userId === AI_USER_INFO.id;

                const feed = feeds.find(
                  (f) =>
                    f.metadata.threadId === thread.id &&
                    f.metadata.commentId === comment.id
                );

                console.log(aiComment, feed);

                // In progress AI comment
                if (aiComment && feed) {
                  return <AiComment comment={comment} feed={feed} />;
                }

                // Human comment or completed AI comment
                return <Comment comment={comment} {...props} />;
              },
            }}
          />
        ))}
        <Composer className="composer" />
      </main>
    </>
  );
}

function AiComment({ feed, comment }: { feed: Feed; comment: CommentData }) {
  const { messages } = useFeedMessages(feed.feedId);
  const lastMessage = messages[messages.length - 1];

  console.log(messages, lastMessage);

  return <div>{lastMessage?.data.stage}</div>;
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
