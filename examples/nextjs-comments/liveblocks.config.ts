"use client";

import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

export const client = createClient({
  authEndpoint: "/api/auth",
});

const {
  RoomProvider,
  suspense: { useThreads },
} = createRoomContext(client, {
  resolveUser: async (userId) => {
    try {
      const response = await fetch(`/api/users?userId=${userId}`);

      return response.json();
    } catch (error) {
      console.error(error);
    }
  },
  resolveUserSearch: async (search) => {
    try {
      const response = await fetch(`/api/users/search?search=${search}`);

      return response.json();
    } catch (error) {
      console.error(error);

      return [];
    }
  },
});

export { RoomProvider, useThreads };
