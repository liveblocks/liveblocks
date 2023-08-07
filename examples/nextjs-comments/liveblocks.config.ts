"use client";

import { createClient } from "@liveblocks/client";
import { createCommentsContext } from "@liveblocks/react-comments";
import { BaseUserInfo } from "@liveblocks/client";

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

// TODO: Doesn't mark CommentsProvider as a Client component
// export const {
//   CommentsProvider,
//   useThreads,
//   suspense: { useThreads: useThreadsSuspense },
// } = createCommentsContext<ThreadMetadata>(client, {
//   resolveUser,
//   resolveMentionSuggestions,
// });

const {
  CommentsProvider,
  useThreads,
  suspense: { useThreads: useThreadsSuspense },
} = createCommentsContext<ThreadMetadata>(client, {
  resolveUser,
  resolveMentionSuggestions,
});

export { CommentsProvider, useThreads, useThreadsSuspense };
