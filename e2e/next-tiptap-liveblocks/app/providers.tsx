"use client";

import { LiveblocksProvider } from "@liveblocks/react";

const USERS = [
  {
    id: "tiptap-user-0",
    name: "Ada Lovelace",
    color: "#e11d48",
    avatar: "https://liveblocks.io/avatars/avatar-0.png",
  },
  {
    id: "tiptap-user-1",
    name: "Grace Hopper",
    color: "#2563eb",
    avatar: "https://liveblocks.io/avatars/avatar-1.png",
  },
  {
    id: "tiptap-user-2",
    name: "Katherine Johnson",
    color: "#16a34a",
    avatar: "https://liveblocks.io/avatars/avatar-2.png",
  },
];

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/auth/liveblocks"
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      resolveMentionSuggestions={async ({ text }) => {
        const query = text.toLowerCase();

        return USERS.filter((user) =>
          user.name.toLowerCase().includes(query)
        ).map((user) => user.id);
      }}
      resolveUsers={async ({ userIds }) => {
        return userIds.map((userId) => {
          const user = USERS.find((user) => user.id === userId);

          return {
            name: user?.name ?? userId,
            color: user?.color ?? "#6b7280",
            avatar: user?.avatar ?? "https://liveblocks.io/avatars/avatar-3.png",
          };
        });
      }}
      throttle={16}
    >
      {children}
    </LiveblocksProvider>
  );
}
