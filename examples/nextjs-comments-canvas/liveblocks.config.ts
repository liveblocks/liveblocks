"use client";

import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

export const client = createClient({
  authEndpoint: "/api/liveblocks-auth",

  // Get users' info from their ID
  resolveUsers: async ({ userIds }) => {
    const searchParams = new URLSearchParams(
      userIds.map((userId) => ["userIds", userId])
    );
    const response = await fetch(`/api/users?${searchParams}`);

    if (!response.ok) {
      throw new Error("Problem resolving users");
    }

    const users = await response.json();
    return users;
  },

  // Find a list of users that match the current search term
  resolveMentionSuggestions: async ({ text }) => {
    const response = await fetch(
      `/api/users/search?text=${encodeURIComponent(text)}`
    );

    if (!response.ok) {
      throw new Error("Problem resolving mention suggestions");
    }

    const userIds = await response.json();
    return userIds;
  },
});

type UserInfo = {
  id: string;
  info: {
    avatar: string;
    name: string;
  };
};

export type ThreadMetadata = {
  x: number;
  y: number;
};

export const {
  suspense: {
    RoomProvider,
    useThreads,
    useEditThreadMetadata,
    useUser,
    useCreateThread,
    useSelf,
  },
} = createRoomContext<{}, {}, UserInfo, {}, ThreadMetadata>(client);
