import { AI_USER_ID } from "@/lib/agent-user";

/**
 * The one thing that can be mentioned in a message is the agent: `@AI` makes
 * sure a message reaches it, bypassing the "is this for the agent?" check
 * (see `lib/server/triage.ts`). Stored inline in message markdown as
 * `<@ai-assistant>`, like `<skill:id>` tokens.
 */
export const AGENT_MENTION_LABEL = "AI";
export const AGENT_MENTION_TOKEN = `<@${AI_USER_ID}>`;

export const MENTION_TOKEN_PATTERN = /<@([^>\s]+)>/g;

export function mentionsAgent(content: string) {
  return content.includes(AGENT_MENTION_TOKEN);
}

export function stripMentionTokens(content: string) {
  return content.replace(MENTION_TOKEN_PATTERN, "").replace(/\s+/g, " ").trim();
}
