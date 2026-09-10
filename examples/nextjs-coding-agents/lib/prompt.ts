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
  "Think and plan out loud before you start editing: work through the request, what you found in the code, and how you'll approach it. Everything you write before your final message is folded into a collapsible log the team can open, so put your reasoning there, not in the final message.",
].join(" ");

const FOLLOW_UP_PREAMBLE = [
  "New messages arrived while you were working, so your reply was NOT shown to the team yet.",
  "Your draft reply is included below for reference only.",
  "Review the work you just completed against the new messages and make any modifications needed.",
  "Then write ONE final message covering every request handled so far, including the earlier ones.",
  "The team will only see this final message, so it must stand on its own, but keep it just as short as usual.",
].join(" ");

/**
 * The closing message is the only thing shown by default; everything else
 * the agent wrote is behind a "Worked for…" toggle, and the diff and pull
 * request have their own UI. So it's kept to a glance.
 */
const FINAL_MESSAGE_INSTRUCTIONS = [
  "## Your final message",
  "Your last message is what the team reads. Everything before it is hidden behind a toggle, and the app shows the diff, changed files, and a link to the branch or pull request on its own. Write it as:",
  "- One short paragraph, at most three sentences, in plain language: what changed and why, in past tense. If a request couldn't or shouldn't be done, say so here.",
  "- Optionally, a second short paragraph or up to four brief bullets, only for things the team should know or double-check. Skip this if there's nothing worth flagging.",
  "Keep it under 80 words. No headings, no code blocks, no links, no file paths, no list of changed files, no restating the request, no sign-off, and don't mention committing, the diff, or the pull request.",
].join("\n");

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
    FINAL_MESSAGE_INSTRUCTIONS,
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
