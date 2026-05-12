import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** Model used by the AI edit API route */
export const aiModel = openai("gpt-5.5");

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

/** Feed id (per room): AI draft preview (streamed); apply to Storage only on Accept */
export const CMS_AI_DRAFT_FEED_ID = "cms-ai-draft";
