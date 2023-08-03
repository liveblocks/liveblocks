"use client";

import { createClient } from "@liveblocks/client";
import { createCommentsContext } from "@liveblocks/react-comments";
// TODO: It needs to be exported from @liveblocks/client or @liveblocks/react-comments
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
  CommentsProvider,
  useThreads,
  suspense: { useThreads: useThreadsSuspense },
} = createCommentsContext<ThreadMetadata>(client, {
  resolveUser,
  resolveMentionSuggestions,
});
