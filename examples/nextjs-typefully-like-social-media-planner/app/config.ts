import { OpenAIChatModelId } from "@ai-sdk/openai/internal/dist";

export const aiModel: OpenAIChatModelId = "gpt-4o-mini";

export function getRoomId(pageId: string) {
  return `liveblocks:examples:${pageId}`;
}

export function getPageId(roomId: string) {
  return roomId.split(":")[2];
}

export function getPageUrl(roomId: string) {
  return `/${getPageId(roomId)}`;
}
