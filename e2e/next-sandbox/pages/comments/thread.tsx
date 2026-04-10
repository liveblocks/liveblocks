import type { ThreadData } from "@liveblocks/core";
import { ClientSideSuspense, createRoomContext } from "@liveblocks/react";
import { Comment, Thread } from "@liveblocks/react-ui";
import type { ComponentProps } from "react";
import { useMemo } from "react";

import { getRoomFromUrl } from "../../utils";
import { createLiveblocksClient } from "../../utils/createClient";

const client = createLiveblocksClient();

const {
  RoomProvider,
  suspense: { useSelf },
} = createRoomContext(client);

export default function Home() {
  const roomId = getRoomFromUrl();

  return (
    <RoomProvider id={roomId} initialPresence={{} as never}>
      <ClientSideSuspense fallback={null}>
        <Sandbox />
      </ClientSideSuspense>
    </RoomProvider>
  );
}

function Sandbox() {
  const roomId = getRoomFromUrl();
  const userId = useSelf().id ?? "user";
  const thread = useMemo<ThreadData>(() => {
    const date = new Date("2026-01-01T00:00:00.000Z");

    return {
      type: "thread",
      id: "th_123",
      roomId,
      createdAt: date,
      updatedAt: date,
      resolved: false,
      metadata: {},
      comments: [
        {
          type: "comment",
          id: "cm_123",
          threadId: "th_123",
          roomId,
          userId,
          createdAt: date,
          reactions: [],
          attachments: [],
          metadata: {},
          body: {
            version: 1,
            content: [
              {
                type: "paragraph",
                children: [{ text: "Hello from e2e" }],
              },
            ],
          },
        },
      ],
    };
  }, [roomId, userId]);

  return (
    <>
      <Thread
        key={thread.id}
        thread={thread}
        className="thread"
        commentDropdownItems={({ comment, children }) => (
          <>
            {children}
            <Comment.DropdownItem
              data-testid="custom-dropdown-item"
              onSelect={(event) => {
                console.log("Custom dropdown item selected", event);
              }}
            >
              Custom dropdown item for {comment.id}
            </Comment.DropdownItem>
          </>
        )}
        components={{
          Comment: (props: ComponentProps<typeof Comment>) => (
            <Comment
              {...props}
              avatar={
                <div data-testid="custom-comment-avatar">
                  <Comment.Avatar userId={props.comment.userId} />
                  <span>Custom avatar</span>
                </div>
              }
              author={
                <span data-testid="custom-comment-author">
                  <Comment.Author userId={props.comment.userId} />
                  <span>Custom author</span>
                </span>
              }
              additionalContent={
                <div data-testid="custom-comment-additional">
                  Custom additional
                </div>
              }
            >
              {({ children }) => (
                <div>
                  <div data-testid="custom-comment-before">Before custom</div>
                  {children}
                  <div data-testid="custom-comment-after">After custom</div>
                </div>
              )}
            </Comment>
          ),
        }}
      />
    </>
  );
}
