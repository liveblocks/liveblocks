"use client";

import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

export const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

// Get the current user's info from their ID
async function resolveUser(userId: string) {
  try {
    const response = await fetch(`/api/users?userId=${userId}`);

    return response.json();
  } catch (error) {
    console.error(123, error);
  }
}

// Find a list of users that match the current search term
async function resolveMentionSuggestions(search: string) {
  try {
    const response = await fetch(`/api/users/search?search=${search}`);

    return response.json();
  } catch (error) {
    console.error(456, error);

    return [];
  }
}

const {
  suspense: { RoomProvider, useThreads },
} = createRoomContext(client, {
  resolveUser,
  resolveMentionSuggestions,
});

export { RoomProvider, useThreads };
