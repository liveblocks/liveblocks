"use client";

import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

export const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

const {
  suspense: {
    RoomProvider,
    useThreads,
    useUser,
    useCreateComment,
    useCreateThread,
  },
} = createRoomContext(client, {
  // Get the current user's info from their ID
  resolveUser: async ({ userId }) => {
    try {
      const response = await fetch(`/api/users?userId=${userId}`);

      return response.json();
    } catch (error) {
      console.error(123, error);
    }
  },

  // Find a list of users that match the current search term
  resolveMentionSuggestions: async ({ text }) => {
    try {
      const response = await fetch(`/api/users/search?text=${text}`);

      return response.json();
    } catch (error) {
      console.error(456, error);

      return [];
    }
  },
});

export { RoomProvider, useThreads, useUser, useCreateThread, useCreateComment };
