"use client";

import { LiveText } from "@liveblocks/client";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import { useSearchParams } from "next/navigation";
import { DiffsEditor } from "../components/diffs-editor";
import { getRandomUser, getUsers } from "./database";
import Loading from "./loading";

// Learn how to structure your collaborative Next.js app
// https://liveblocks.io/docs/guides/how-to-use-liveblocks-with-nextjs-app-directory

const DEFAULT_CODE = `type Comment = {
  id: string;
  body: string;
  resolved: boolean;
};

export function summarize(comments: Comment[]) {
  const open = comments.filter((comment) => !comment.resolved);

  return {
    total: comments.length,
    open: open.length,
    message:
      open.length === 0
        ? "Ready to merge"
        : \`\${open.length} comments still need attention\`,
  };
}
`;

const defaultUserId = getRandomUser().id;

export default function Page() {
  const roomId = useExampleRoomId(
    "liveblocks:examples:nextjs-diffs-editor"
  );
  const userId = useExampleUserId(defaultUserId);

  return (
    <LiveblocksProvider
      throttle={16}
      authEndpoint={async (room) => {
        const response = await fetch("/api/liveblocks-auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ room, userId }),
        });

        return await response.json();
      }}
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      resolveUsers={async ({ userIds }) => {
        const searchParams = new URLSearchParams(
          userIds.map((userId) => ["userIds", userId])
        );
        const response = await fetch(`/api/users?${searchParams}`);

        if (!response.ok) {
          throw new Error("Problem resolving users");
        }

        return await response.json();
      }}
    >
      <RoomProvider
        id={roomId}
        initialPresence={{ selection: null }}
        initialStorage={{
          text: new LiveText(DEFAULT_CODE),
        }}
      >
        <ClientSideSuspense fallback={<Loading />}>
          <DiffsEditor />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useExampleRoomId(roomId: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");
  return exampleId ? `${roomId}-${exampleId}` : roomId;
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useExampleUserId(defaultId: string) {
  const params = useSearchParams();
  const examplePreview = params?.get("examplePreview");

  if (examplePreview === null) {
    return defaultId;
  }

  const preview = Number(examplePreview);
  const users = getUsers();
  const user = Number.isFinite(preview)
    ? users[preview % users.length]
    : undefined;

  return user?.id ?? defaultId;
}
