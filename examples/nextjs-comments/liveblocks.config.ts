import type { LsonObject } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { createCommentsContext } from "@liveblocks/react-comments";

const WORKERS_ENDPOINT = process.env.NEXT_PUBLIC_WORKERS_ENDPOINT;
const EVENTS_ENDPOINT = process.env.NEXT_PUBLIC_EVENTS_ENDPOINT;

export const client = createClient({
  authEndpoint: "/api/auth",
  liveblocksServer: `wss://${WORKERS_ENDPOINT}/v6`,
  eventsServerEndpoint: `wss://${EVENTS_ENDPOINT}/v1`,
});

export async function resolveUser(userId: string) {
  const response = await fetch(`/api/users/${userId}`);
  const user = await response.json();

  return {
    id: user.id,
    info: {
      name: user.name,
      avatar: user.avatar,
    },
  };
}

export async function resolveMentionSuggestions(value: string) {
  const response = await fetch(
    `/api/users/search?query=${encodeURIComponent(value)}`
  );
  const users = await response.json();

  return users;
}

export type ThreadMetadata = {
  resolved: boolean;
};

export type UserMeta = {
  id: string;
  info: {
    name: string;
    avatar: string;
  };
};

export type Presence = {
  isTyping: string | boolean;
};

export const {
  suspense: { useThreads, useUser },
  createComment,
  createThread,
  deleteComment,
  editComment,
  editThread,
} = createCommentsContext<ThreadMetadata, UserMeta>(client, {
  resolveUser,
  serverEndpoint: `https://${WORKERS_ENDPOINT}/v2`,
});

export const { RoomProvider, useOthers, useUpdateMyPresence } =
  createRoomContext<Presence, LsonObject, UserMeta>(client);
