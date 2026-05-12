import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** Model used by the AI edit API route */
export const aiModel = openai("gpt-4o-mini");

export function getRoomId(postId: string) {
  return `liveblocks:examples:nextjs-ai-cms:${postId}`;
}

export function getPostIdFromRoomId(roomId: string) {
  const prefix = "liveblocks:examples:nextjs-ai-cms:";
  return roomId.startsWith(prefix) ? roomId.slice(prefix.length) : roomId;
}

export function getPostUrl(postId: string) {
  return `/${postId}`;
}

/** Feed id (per room) used for AI edit streaming events */
export const CMS_AI_FEED_ID = "cms-ai";

/** Presence user id for server-driven AI presence */
export const AI_CMS_USER_ID = "ai@nextjs-ai-cms";
