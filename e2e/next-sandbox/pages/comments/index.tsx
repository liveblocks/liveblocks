import { createRoomContext } from "@liveblocks/react";
import { useRef } from "react";

import { getRoomFromUrl, Row } from "../../utils";
import Button from "../../utils/Button";
import { createLiveblocksClient } from "../../utils/createClient";

const client = createLiveblocksClient();

const { RoomProvider, useThreads, useCreateThread, useDeleteComment } =
  createRoomContext(client);

export default function Home() {
  const roomId = getRoomFromUrl();

  return (
    <RoomProvider id={roomId} initialPresence={{} as never}>
      <Sandbox />
    </RoomProvider>
  );
}

function Sandbox() {
  const { threads, isLoading } = useThreads();
  const threadInfoRef = useRef<{
    threadId: string;
    commentId: string;
  }>();
  const createThread = useCreateThread();
  const deleteComment = useDeleteComment();

  return (
    <>
      <table>
        <tbody>
          <Row id="isLoading" name="isLoading" value={isLoading} />
          <Row
            id="numOfThreads"
            name="Number of Threads"
            value={threads?.length}
          />
        </tbody>
      </table>
      <Button
        id="create-thread"
        onClick={() => {
          const thread = createThread({
            body: {
              version: 1,
              content: [],
            },
          });
          threadInfoRef.current = {
            threadId: thread.id,
            commentId: thread.comments[0].id,
          };
        }}
      >
        Create thread
      </Button>

      <Button
        id="delete-comment"
        onClick={() => {
          if (!threadInfoRef.current) return;
          deleteComment(threadInfoRef.current);
        }}
      >
        Delete Comment
      </Button>
    </>
  );
}
