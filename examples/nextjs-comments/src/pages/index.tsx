import { Comment, Composer } from "@liveblocks/react-comments";
import { useRouter } from "next/router";
import React, { useEffect, useMemo } from "react";
import { useCookies } from "react-cookie";

import {
  createComment,
  createThread,
  deleteComment,
  useThreads,
} from "../../liveblocks.suspense.config";
import { Button } from "../components/Button";
import { useHydrated } from "../utils/use-hydrated";

const USER_ID = "user";
const ROOM_ID = "comments-react";

function Example({ roomId }: { roomId: string }) {
  const threads = useThreads(roomId);

  return (
    <main className="mt-14">
      <div className="mx-auto flex w-full max-w-lg flex-col px-4">
        <div className="flex w-full flex-col gap-8">
          {threads.map((thread) => (
            <div key={thread.id} className="rounded-lg bg-white shadow-lg">
              <div className="flex flex-col transition">
                {thread.comments
                  .filter((comment) => comment.body !== undefined)
                  .map((comment) => (
                    <div key={comment.id} className="p-4">
                      {comment.body && <Comment.Body body={comment.body} />}
                      <Button
                        variant="secondary"
                        onClick={() =>
                          deleteComment(roomId, {
                            commentId: comment.id,
                            threadId: thread.id,
                          })
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          ))}

          <Composer.Form
            className="relative flex flex-col rounded-[inherit] bg-white"
            onCommentSubmit={({ body }) => {
              if (threads.length === 0) {
                createThread(roomId, { body, metadata: { resolved: false } });
              } else {
                createComment(roomId, { threadId: threads[0].id, body });
              }
            }}
          >
            <Composer.Body className="max-h-[10lh] flex-1 overflow-y-auto p-4 outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50" />
          </Composer.Form>
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  const userId = useOverrideUserId(USER_ID);
  const roomId = useOverrideRoomId(ROOM_ID);
  const isHydrated = useHydrated();

  if (!roomId || !userId || !isHydrated) {
    return null;
  }

  return <Example roomId={roomId} />;
}

function useOverrideRoomId(roomId: string) {
  const { query, isReady } = useRouter();
  const overrideRoomId = useMemo(() => {
    return isReady
      ? query?.roomId
        ? `${roomId}-${query.roomId}`
        : roomId
      : undefined;
  }, [isReady, query.roomId, roomId]);

  return overrideRoomId;
}

function useOverrideUserId(userId: string) {
  const [, setCookie] = useCookies(["userId"]);
  const { query, isReady } = useRouter();
  const overrideUserId = useMemo(() => {
    return isReady
      ? query?.userId
        ? `${userId}-${query.userId}`
        : userId
      : undefined;
  }, [isReady, query, userId]);

  useEffect(() => {
    if (overrideUserId) {
      setCookie("userId", overrideUserId, {
        path: "/",
        maxAge: 3600,
        sameSite: true,
      });
    }
  }, [overrideUserId, setCookie]);

  return overrideUserId;
}
