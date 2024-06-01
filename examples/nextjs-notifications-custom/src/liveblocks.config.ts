"use client";

import { createClient } from "@liveblocks/client";
import { createLiveblocksContext, createRoomContext } from "@liveblocks/react";

export const client = createClient({
  authEndpoint: "/api/liveblocks-auth",

  // Get users' info from their ID
  resolveUsers: async ({ userIds }) => {
    const searchParams = new URLSearchParams(
      userIds.map((userId) => ["userIds", userId])
    );
    const response = await fetch(`/api/users?${searchParams}`);

    if (!response.ok) {
      throw new Error("Problem resolving user");
    }

    const users = await response.json();
    return users;
  },
});

export type UserMeta = {
  id: string;
  info: {
    name: string;
    color: string;
    avatar: string;
  };
};

export const {
  suspense: { LiveblocksProvider, useInboxNotifications },
} = createLiveblocksContext(client);

export const {
  suspense: { RoomProvider, useSelf, useUser },
} = createRoomContext<{}, {}, UserMeta>(client);
