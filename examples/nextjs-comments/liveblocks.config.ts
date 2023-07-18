import { createClient } from "@liveblocks/client";
import {
  createCommentsContext,
  withComponents,
} from "@liveblocks/react-comments";
import { NAMES } from "./src/constants";

const WORKERS_ENDPOINT = process.env.NEXT_PUBLIC_WORKERS_ENDPOINT;
const EVENTS_ENDPOINT = process.env.NEXT_PUBLIC_EVENTS_ENDPOINT;

export const client = createClient({
  authEndpoint: "/api/auth",
  liveblocksServer: `wss://${WORKERS_ENDPOINT}/v6`,
  eventsServerEndpoint: `wss://${EVENTS_ENDPOINT}/v1`,
});

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

export async function resolveUser(userId: string): Promise<UserMeta> {
  const userIndex = Number(userId.replace(/^\D+/g, "")) ?? 0;

  return {
    id: userId,
    info: {
      name: NAMES[userIndex],
      avatar: `https://liveblocks.io/avatars/avatar-${userIndex}.png`,
    },
  };
}

export const {
  suspense: { useThreads, useUser },
  createComment,
  createThread,
  deleteComment,
  editComment,
  editThread,
  Comment,
} = withComponents(
  createCommentsContext<ThreadMetadata, UserMeta>(client, {
    resolveUser,
    serverEndpoint: `https://${WORKERS_ENDPOINT}/v2`,
  }),
  {
    resolveUserName: (user) => user.info.name,
    resolveUserAvatar: (user) => user.info.avatar,
  }
);
