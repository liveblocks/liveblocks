"use client";

import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
// TODO: Remove and use UserMeta info instead
import { BaseUserInfo } from "@liveblocks/core";

export const client = createClient({
  authEndpoint: "/api/auth",
});

export type ThreadMetadata = {
  resolved: boolean;
  x: number;
  y: number;
};

async function resolveUser(userId: string) {
  try {
    const response = await fetch(`/api/user?userId=${userId}`);

    return response.json() as Promise<BaseUserInfo>;
  } catch (error) {
    console.error(error);
  }
}

async function resolveMentionSuggestions(text: string) {
  try {
    const response = await fetch(`/api/mentions?text=${text}`);

    return response.json() as Promise<string[]>;
  } catch (error) {
    console.error(error);

    return [];
  }
}

export const {
  RoomProvider,
  useThreads,
  suspense: { useThreads: useThreadsSuspense },
} = createRoomContext(client, {
  resolveUser,
  resolveMentionSuggestions,
});
