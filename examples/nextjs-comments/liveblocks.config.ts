"use client";

import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

export const client = createClient({
  authEndpoint: "/api/auth",
});

const {
  RoomProvider,
  useThreads,
  suspense: { useThreads: useThreadsSuspense },
} = createRoomContext(client, {
  resolveUser: async (userId) => {
    try {
      const response = await fetch(`/api/user?userId=${userId}`);

      return response.json();
    } catch (error) {
      console.error(error);
    }
  },
  resolveUserSearch: async (search) => {
    try {
      const response = await fetch(`/api/users?search=${search}`);

      return response.json();
    } catch (error) {
      console.error(error);

      return [];
    }
  },
});

export { RoomProvider, useThreads, useThreadsSuspense };
