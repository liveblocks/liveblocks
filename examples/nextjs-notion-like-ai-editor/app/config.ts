import { openai } from "@ai-sdk/openai";
import { LanguageModel } from "ai";

export const aiModel: LanguageModel = openai("gpt-5.2-codex");

export function getRoomId(pageId: string) {
  return `liveblocks:examples:${pageId}`;
}

export function getPageId(roomId: string) {
  return roomId.split(":")[2];
}

export function getPageUrl(roomId: string) {
  return `/${getPageId(roomId)}`;
}
