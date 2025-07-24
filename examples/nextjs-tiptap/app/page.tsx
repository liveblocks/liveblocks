"use client";

import Loading from "./loading";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import { useSearchParams } from "next/navigation";
import Editor from "./tiptap/editor";
import { USER_INFO } from "./api/database";
import { MentionData } from "@liveblocks/client";

// Learn how to structure your collaborative Next.js app
// https://liveblocks.io/docs/guides/how-to-use-liveblocks-with-nextjs-app-directory

const USERS = USER_INFO.map((user) => ({
  kind: "user" as const,
  id: user.id,
  name: user.info.name,
  avatar: user.info.avatar,
  color: user.info.color,
}));
const GROUPS = [
  { kind: "group" as const, id: "engineering", name: "Engineering" },
  {
    kind: "group" as const,
    id: "design",
    name: "Design",
    avatar: "https://liveblocks.io/favicon.svg",
  },
  { kind: "group" as const, id: "unknown" },
  {
    kind: "group" as const,
    id: "access",
    userIds: ["user-0", "user-1", "user-2"],
  },
];

export default function Page() {
  const roomId = useExampleRoomId("liveblocks:examples:nextjs-tiptap");

  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      // TODO: Temporary, revert
      resolveUsers={async ({ userIds }) => {
        return userIds.map((userId) => {
          const user = USERS.find((user) => user.id === userId);

          if (!user) {
            return;
          }

          return {
            name: user.name,
            avatar: user.avatar,
            color: user.color,
          };
        });
      }}
      // TODO: Temporary, revert
      resolveMentionSuggestions={async ({ text }) => {
        return [...GROUPS, ...USERS]
          .filter((suggestion) => {
            return text
              ? (suggestion.name ?? suggestion.id)
                  .toLowerCase()
                  .includes(text.toLowerCase())
              : true;
          })
          .map((suggestion) => {
            if (suggestion.kind === "group") {
              return {
                id: suggestion.id,
                kind: "group",
                userIds: suggestion.userIds,
              };
            }

            return {
              kind: "user",
              id: suggestion.id,
            };
          }) as MentionData[];
      }}
      // TODO: Temporary, remove
      resolveGroupsInfo={async ({ groupIds }) => {
        return groupIds.map((groupId) => {
          const group = GROUPS.find((group) => group.id === groupId);

          return {
            name: group?.name,
            avatar: group?.avatar,
          };
        });
      }}
    >
      <RoomProvider
        id={roomId}
        initialPresence={{
          cursor: null,
        }}
      >
        <ClientSideSuspense fallback={<Loading />}>
          <Editor />
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
