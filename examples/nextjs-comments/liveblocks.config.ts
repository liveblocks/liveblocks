"use client";

import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

export const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

const {
  suspense: { RoomProvider, useThreads },
} = createRoomContext(client, {
  // Get users' info from their ID
  resolveUsers: async ({ userIds }) => {
    const searchParams = new URLSearchParams(
      userIds.map((userId) => ["userIds", userId])
    );

    try {
      const response = await fetch(`/api/users?${searchParams}`);

      return response.json();
    } catch (error) {
      console.error(123, error);
    }
  },

  // Find a list of users that match the current search term
  resolveMentionSuggestions: async ({ text }) => {
    const searchParams = new URLSearchParams({ text });

    try {
      const response = await fetch(`/api/users/search?${searchParams}`);

      return response.json();
    } catch (error) {
      console.error(456, error);

      return [];
    }
  },
});

export { RoomProvider, useThreads };
