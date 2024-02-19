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
      throw new Error("Problem resolving user");
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
      throw new Error("Problem resolving user");
    }

    const userIds = await response.json();
    return userIds;
  },
});

// We're reusing this type in multiple places for consistency.
export type UserMeta = {
  id: string;
  info: {
    name: string;
    color: string;
    avatar: string;
  };
};

const {
  suspense: { RoomProvider, useThreads },
} = createRoomContext<{}, {}, UserMeta, {}>(client);

export { RoomProvider, useThreads };
