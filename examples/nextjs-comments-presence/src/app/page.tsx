"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider, useThreads } from "@liveblocks/react/suspense";
import { Loading } from "../components/Loading";
import { Composer, Thread, Comment, ThreadProps } from "@liveblocks/react-ui";
import { ClientSideSuspense, useOthers, useSelf } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";

function useUserIdPresence(userId: string) {
  const isSelfPresent = useSelf((self) => self.id === userId) ?? false;
  const isOtherPresent =
    useOthers((others) => others.some((other) => other.id === userId)) ?? false;

  return isSelfPresent || isOtherPresent;
}

function CommentAvatarWithPresence({ userId }: { userId: string }) {
  const isPresent = useUserIdPresence(userId);

  return (
    <div className="comment-avatar">
      <Comment.Avatar userId={userId} />
      {isPresent ? <div className="comment-avatar-presence-indicator" /> : null}
    </div>
  );
}

function ThreadWithPresence(props: ThreadProps) {
  return (
    <Thread
      {...props}
      components={{
        Comment: ({ comment, ...props }) => (
          <Comment
            {...props}
            comment={comment}
            avatar={<CommentAvatarWithPresence userId={comment.userId} />}
          />
        ),
      }}
    />
  );
}

function Example() {
  const { threads } = useThreads();

  return (
    <main>
      {threads.map((thread) => (
        <ThreadWithPresence
          key={thread.id}
          thread={thread}
          className="thread"
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
