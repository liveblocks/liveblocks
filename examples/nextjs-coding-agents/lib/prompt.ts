import { DIFF_ARTIFACT_DIR, DIFF_ARTIFACT_FILE } from "@/lib/repo";
import { coAuthorTrailer, type GitHubUser } from "@/lib/server/github";
import {
  getSkill,
  getSkillIdsFromContent,
  stripSkillTokens,
} from "@/lib/skills";
import type { ChatMessage } from "@/lib/types";

/** Display names for the people in a chat, keyed by GitHub login. */
export type Participants = ReadonlyMap<string, GitHubUser>;

const PREAMBLE = [
  "You are working inside a shared chat where several people talk to you at the same time.",
  "Each message below is prefixed with its author's name. Address every person's request.",
  "If requests conflict, say so and pick the safest option.",
  "When you are done, write a short summary in Markdown: what you changed, which files, and anything the team should double-check.",
].join(" ");

const FOLLOW_UP_PREAMBLE = [
  "New messages arrived while you were working, so your reply was NOT shown to the team yet.",
  "Your draft reply is included below for reference only.",
  "Review the work you just completed against the new messages and make any modifications needed.",
  "Then write ONE final summary covering every request handled so far, including the earlier ones, addressing each person by name.",
  "The team will only see this final summary, so it must stand on its own.",
].join(" ");

/** Replaces `<@login>` tokens with `@Name` so the model sees readable names. */
export function resolveMentions(content: string, users?: Participants) {
  return content.replace(/<@([^>]+)>/g, (_, login: string) => {
    return `@${users?.get(login)?.name ?? login}`;
  });
}

/**
 * Builds the prompt for one run from the human messages that haven't been
 * handled yet. Skills referenced in those messages are expanded into their
 * instructions ahead of the messages themselves.
 *
 * For follow-up runs, `previousReply` is the draft the agent produced before
 * the new messages arrived. It was never shown to the team, so it's handed
 * back to the agent to revise into a single final reply.
 */
export function buildPrompt({
  messages,
  users,
  repoRef,
  previousReply,
}: {
  messages: ChatMessage[];
  users: Participants;
  /** Base branch, used for the diff the agent saves */
  repoRef: string;
  previousReply?: string;
}) {
  const isFollowUp = previousReply !== undefined;
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
    const author = users.get(message.data.userId)?.name ?? message.data.userId;
    const content = resolveMentions(
      stripSkillTokens(message.data.content),
      users
    );
    return `**${author}:** ${content}`;
  });

  return [
    isFollowUp ? FOLLOW_UP_PREAMBLE : PREAMBLE,
    ...skillSections,
    ...(isFollowUp
      ? [
          "## Your draft reply (not shown to the team)",
          previousReply.trim() || "_(no summary was written)_",
          "## New messages",
        ]
      : ["## Messages"]),
    ...messageSections,
    buildWrapUpInstructions(messages, users, repoRef),
  ].join("\n\n");
}

/**
 * Housekeeping the agent does at the end of every run. Commits are made by
 * the Cursor GitHub App, so the people who asked for the work are credited
 * with `Co-authored-by` trailers. The diff is saved as a Cursor artifact so
 * the chat can show the changes without needing GitHub access.
 */
function buildWrapUpInstructions(
  messages: ChatMessage[],
  users: Participants,
  repoRef: string
) {
  const trailers = [
    ...new Set(
      messages
        .map((message) => users.get(message.data.userId))
        .filter((user) => user !== undefined)
        .map((user) => coAuthorTrailer(user))
    ),
  ];

  return [
    "## Before you finish",
    "1. Commit all of your changes yourself with a clear commit message. Leave a blank line after the message body and add these trailers, one per line, exactly as written:",
    trailers.length > 0
      ? trailers.map((t) => `   ${t}`).join("\n")
      : "   (none)",
    `2. After committing, save a unified diff of everything you changed compared to \`origin/${repoRef}\` to \`${DIFF_ARTIFACT_FILE}\`, which is the artifacts directory outside the repository. Run exactly: \`mkdir -p ${DIFF_ARTIFACT_DIR} && git diff origin/${repoRef}...HEAD > ${DIFF_ARTIFACT_FILE}\`. Do this even if the diff is empty, and never commit this file.`,
    '3. If you open or update a pull request, list the people above under a "Requested by" heading in its description.',
    "4. End with a short final message for the team: two to four plain sentences on what you changed and anything they should know. The app already shows your steps, the diff, and a link to the branch or pull request, so do not repeat those, and do not include any links or a list of changed files.",
  ].join("\n");
}

/** Chat title derived from the first human message. */
export function deriveTitle(content: string, users?: Participants) {
  const plain = resolveMentions(stripSkillTokens(content), users)
    .replace(/[`*_~#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) {
    return "New chat";
  }
  const title = capitalizeFirst(
    plain.length > 60 ? `${plain.slice(0, 59).trimEnd()}…` : plain
  );
  return title;
}

export function capitalizeFirst(text: string) {
  if (!text) {
    return text;
  }
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}
