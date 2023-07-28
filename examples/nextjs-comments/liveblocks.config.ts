import { createClient } from "@liveblocks/client";
import { createCommentsContext } from "@liveblocks/react-comments";
import { NAMES } from "./src/constants";
// TODO: It needs to be exported from @liveblocks/client or @liveblocks/react-comments
import { BaseUserInfo } from "@liveblocks/core";

const WORKERS_ENDPOINT = process.env.NEXT_PUBLIC_WORKERS_ENDPOINT;
const EVENTS_ENDPOINT = process.env.NEXT_PUBLIC_EVENTS_ENDPOINT;

export const client = createClient({
  authEndpoint: "/api/auth",
  liveblocksServer: `wss://${WORKERS_ENDPOINT}/v6`,
  eventsServerEndpoint: `wss://${EVENTS_ENDPOINT}/v1`,
});

export type ThreadMetadata = {
  resolved: boolean;
  x: number;
  y: number;
};

async function resolveUser(userId: string): Promise<BaseUserInfo> {
  const userIndex = Number(userId.replace(/^\D+/g, "")) ?? 0;

  return {
    name: NAMES[userIndex],
    avatar: `https://liveblocks.io/avatars/avatar-${userIndex}.png`,
  };
}

async function resolveMentionSuggestions(text: string): Promise<string[]> {
  const userIndices = [...NAMES.keys()];

  return userIndices.map((userIndex) => `user-${userIndex}`);
}

export const {
  CommentsProvider,
  suspense: { useThreads, useUser, useRoomId },
  useCreateComment,
  useEditComment,
  useDeleteComment,
  useCreateThread,
  useEditThreadMetadata,
} = createCommentsContext<ThreadMetadata>(client, {
  resolveUser,
  resolveMentionSuggestions,
  serverEndpoint: `https://${WORKERS_ENDPOINT}/v2`,
});
