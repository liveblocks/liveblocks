import { getUser } from "@/app/database";
import {
  getSkill,
  getSkillIdsFromContent,
  stripSkillTokens,
} from "@/lib/skills";
import type { ChatMessage } from "@/lib/types";

const PREAMBLE = [
  "You are working inside a shared chat where several people talk to you at the same time.",
  "Each message below is prefixed with its author's name. Address every person's request.",
  "If requests conflict, say so and pick the safest option.",
  "When you are done, write a short summary in Markdown: what you changed, which files, and anything the team should double-check.",
].join(" ");

const FOLLOW_UP_PREAMBLE = [
  "New messages arrived while you were working.",
  "Review the work you just completed against them and make any modifications needed.",
  "Then write ONE final summary covering every request handled so far, addressing each person by name.",
].join(" ");

/** Replaces `<@userId>` tokens with `@Name` so the model sees readable names. */
export function resolveMentions(content: string) {
  return content.replace(/<@([^>]+)>/g, (_, userId: string) => {
    const user = getUser(userId);
    return user ? `@${user.info.name}` : `@${userId}`;
  });
}

/**
 * Builds the prompt for one run from the human messages that haven't been
 * handled yet. Skills referenced in those messages are expanded into their
 * instructions ahead of the messages themselves.
 */
export function buildPrompt(messages: ChatMessage[], isFollowUp: boolean) {
  const skillIds = new Set<string>();
  for (const message of messages) {
    for (const id of getSkillIdsFromContent(message.data.content)) {
      skillIds.add(id);
    }
  }

  const skillSections = [...skillIds]
    .map((id) => getSkill(id))
    .filter((skill) => skill !== undefined)
    .map((skill) => `## Skill: ${skill.name}\n${skill.instructions}`);

  const messageSections = messages.map((message) => {
    const author = getUser(message.data.userId)?.info.name ?? "Someone";
    const content = resolveMentions(stripSkillTokens(message.data.content));
    return `**${author}:** ${content}`;
  });

  return [
    isFollowUp ? FOLLOW_UP_PREAMBLE : PREAMBLE,
    ...skillSections,
    "## Messages",
    ...messageSections,
  ].join("\n\n");
}

/** Chat title derived from the first human message. */
export function deriveTitle(content: string) {
  const plain = resolveMentions(stripSkillTokens(content))
    .replace(/[`*_~#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) {
    return "New chat";
  }
  return plain.length > 60 ? `${plain.slice(0, 59).trimEnd()}…` : plain;
}
