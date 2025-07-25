"use client";

import { MentionData } from "@liveblocks/client";
import { LiveblocksProvider } from "@liveblocks/react";
import { PropsWithChildren } from "react";
import { NAMES } from "../database";

const USERS = [...NAMES.keys()].map((userIndex) => ({
  kind: "user" as const,
  id: `user-${userIndex}`,
  name: NAMES[userIndex],
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
    id: "here",
    description: "Everyone currently connected",
    userIds: ["user-0", "user-1", "user-2"],
  },
];

export function Providers({ children }: PropsWithChildren) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      // TODO: Temporary, revert
      resolveUsers={async ({ userIds }) => {
        return userIds.map((userId) => {
          if (!userId.startsWith("user-")) {
            return;
          }

          const userIndex = Number(userId.replace(/^\D+/g, "")) ?? 0;

          return {
            name: NAMES[userIndex],
            avatar: `https://liveblocks.io/avatars/avatar-${userIndex}.png`,
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
            description: group?.description,
          };
        });
      }}
    >
      {children}
    </LiveblocksProvider>
  );
}
