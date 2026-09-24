import { DOCS_ARTIFACT_DIR } from "@/lib/documents";
import { stripMentionTokens } from "@/lib/mentions";
import { DIFF_ARTIFACT_DIR, DIFF_ARTIFACT_FILE } from "@/lib/repo";
import { coAuthorTrailer, type GitHubUser } from "@/lib/server/github";
import {
  getSkillIdsFromContent,
  stripSkillTokens,
  type Skill,
} from "@/lib/skills";
import type { ChatMessage } from "@/lib/types";

/** Message text without the `<skill:id>` and `<@id>` tokens the UI renders as chips */
function stripTokens(content: string) {
  return stripMentionTokens(stripSkillTokens(content));
}

/** Display names for the people in a chat, keyed by GitHub login. */
export type Participants = ReadonlyMap<string, GitHubUser>;

/** A document already in the chat, as shown to the agent */
export type PromptDocument = {
  slug: string;
  title: string;
  content: string;
};

// Documents are usually short; anything past this is cut in the prompt
const MAX_DOCUMENT_CHARS = 20_000;

const PREAMBLE = [
  "You are working inside a shared chat where several people talk to you at the same time.",
  "Each message below is prefixed with its author's name. Address every person's request.",
  "If requests conflict, say so and pick the safest option.",
  "Think and plan out loud before you start editing: work through the request, what you found in the code, and how you'll approach it. Everything you write before your final message is folded into a collapsible log the team can open, so put your reasoning there, not in the final message.",
].join(" ");

/**
 * The team watches the run live and reviews the result in the app, so a
 * fast first version beats a polished one.
 */
const SPEED_INSTRUCTIONS = [
  "## Work fast",
  "Finish as quickly as you can and hand the result back to the team. Make the change directly rather than exploring more of the codebase than the task needs, and don't write tests, run test suites, lint, typecheck, or build to verify your work unless a person or a skill explicitly asks for it. The team reviews the diff in the app and will come back with follow-ups; a quick first version they can react to is worth more than a thorough one they wait for.",
].join("\n");

const FOLLOW_UP_PREAMBLE = [
  "New messages arrived while you were working, so your reply was NOT shown to the team yet.",
  "Your draft reply is included below for reference only.",
  "Review the work you just completed against the new messages and make any modifications needed.",
  "Then write ONE final message covering every request handled so far, including the earlier ones.",
  "The team will only see this final message, so it must stand on its own, but keep it just as short as usual.",
].join(" ");

/**
 * Chats can be started without a repository. The agent still has a machine
 * to work on, but nothing is checked out and there's nowhere to push.
 */
const NO_REPOSITORY_NOTE = [
  "## No repository",
  "This chat has no repository attached: nothing is checked out and there is no remote to push to. Don't try to clone anything or open a pull request. Answer in chat, or write a document (see below) when the request calls for one. If someone asks for code changes to a repository, explain that they can attach one with the repository dropdown under the message box, then ask again.",
].join("\n");

/**
 * Besides code, the agent can produce Markdown documents: plans, reports,
 * investigation notes, specs. They're saved as artifacts and the workflow
 * copies them into Storage after the run, where the side panel shows them.
 */
const DOCUMENT_INSTRUCTIONS = [
  "## Documents",
  `When someone asks for a written deliverable rather than code (a plan, a report, notes from an investigation, a spec, a summary), or when a document is the better format for what's being asked, write it as a Markdown file in \`${DOCS_ARTIFACT_DIR}/\`. The team sees these documents rendered in a side panel next to the chat, and can edit them there.`,
  `- Name the file with a short kebab-case slug, e.g. \`${DOCS_ARTIFACT_DIR}/release-plan.md\`. Start the file with a \`# Title\` heading.`,
  "- To update an existing document, rewrite the whole file under the same name, changing only what needs to change. The current content of each document is included below when there are any; treat that as the source of truth, since people may have edited it after you last wrote the file. Only your changes are merged in, so a paragraph you leave as it is stays as it is even if someone edits it while you work.",
  "- Stick to standard Markdown: headings, paragraphs, bold and italics, links, inline code, bulleted and numbered lists, fenced code blocks, quotes, and horizontal rules. Tables and raw HTML don't render.",
  "- These files are not part of the repository. Never commit them.",
  "- Don't create a document when a plain chat reply will do.",
].join("\n");

function buildDocumentsSection(documents: PromptDocument[]) {
  if (documents.length === 0) {
    return null;
  }
  return [
    "## Current documents in this chat",
    ...documents.map((document) => {
      const truncated = document.content.length > MAX_DOCUMENT_CHARS;
      const content = truncated
        ? `${document.content.slice(0, MAX_DOCUMENT_CHARS)}\n\n_(truncated)_`
        : document.content;
      return [
        `### ${DOCS_ARTIFACT_DIR}/${document.slug}.md — ${document.title}`,
        "````markdown",
        content,
        "````",
      ].join("\n");
    }),
  ].join("\n\n");
}

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
  "Keep it under 80 words. No headings, no code blocks, no links, no file paths, no list of changed files, no restating the request, no sign-off, and don't mention committing, the diff, or the pull request. If you wrote a document, say so in a few words; the app shows it next to the chat, so don't paste its contents.",
].join("\n");

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
  skills,
  repoRef,
  documents = [],
  previousReply,
}: {
  messages: ChatMessage[];
  users: Participants;
  /** Every skill in the `skills/` directory; only referenced ones are used */
  skills: Skill[];
  /** Base branch, used for the diff the agent saves; unset without a repo */
  repoRef?: string;
  /** Documents already written in this chat, with their current content */
  documents?: PromptDocument[];
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
    .map((id) => skills.find((skill) => skill.id === id))
    .filter((skill) => skill !== undefined)
    .map((skill) => `## Skill: ${skill.name}\n${skill.instructions}`);

  const messageSections = messages.map((message) => {
    const author = users.get(message.data.userId)?.name ?? message.data.userId;
    return `**${author}:** ${stripTokens(message.data.content)}`;
  });

  return [
    isFollowUp ? FOLLOW_UP_PREAMBLE : PREAMBLE,
    SPEED_INSTRUCTIONS,
    repoRef === undefined ? NO_REPOSITORY_NOTE : null,
    ...skillSections,
    DOCUMENT_INSTRUCTIONS,
    buildDocumentsSection(documents),
    ...(isFollowUp
      ? [
          "## Your draft reply (not shown to the team)",
          previousReply.trim() || "_(no summary was written)_",
          "## New messages",
        ]
      : ["## Messages"]),
    ...messageSections,
    repoRef === undefined
      ? null
      : buildWrapUpInstructions(messages, users, repoRef),
    FINAL_MESSAGE_INSTRUCTIONS,
  ]
    .filter((section) => section !== null)
    .join("\n\n");
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

/**
 * System prompt for a plain chat reply (no coding session), written by a
 * language model straight into the chat when triage decides a message only
 * needs an answer. It sees the same documents as the coding agent.
 */
export function buildChatReplySystemPrompt({
  repo,
  agentRunning,
  documents,
}: {
  /** The chat's repository and the coding agent's branch, if any */
  repo: {
    repoName: string;
    baseRef: string;
    branch?: string;
    prUrl?: string;
  } | null;
  agentRunning: boolean;
  documents: PromptDocument[];
}) {
  return [
    [
      "You answer questions in a team's shared chat. Several people talk in it; each message from a person is prefixed with their name. Answer the latest message, using the earlier ones as context.",
      "The chat also has a coding agent: a separate process that reads and changes the repository, runs commands, opens pull requests, and writes documents. Its earlier messages appear in the conversation prefixed with `Coding agent:`. They were not written by you, and you have none of its abilities.",
      "You are answering in text only. You cannot edit, create, run, test, commit, or check anything, now or after this reply, and nothing you write causes any change. Never say that you will make a change, that you are making one, or that you have made one. If what's being asked needs the repository changed, a command run, a pull request, or a document written or edited, say in one sentence that it needs a coding session and that asking for the change directly will start one; then answer whatever part you can answer with words alone.",
      "Be concise and direct. Use Markdown; keep formatting light. Don't restate the question or sign off.",
    ].join(" "),
    repo
      ? [
          "## Repository",
          `This chat is about \`${repo.repoName}\`, base branch \`${repo.baseRef}\`.`,
          repo.branch
            ? `The coding agent works on the branch \`${repo.branch}\`${repo.prUrl ? `, with the pull request ${repo.prUrl}` : ""}.`
            : "The coding agent hasn't pushed a branch yet.",
          agentRunning
            ? "The coding agent is working right now, so its branch may change while you answer."
            : null,
          "You can read the repository with the tools you have: list directories, read files, search code, list commits, and get the diff of the coding agent's changes. When a question is about the code, the branch, or what was changed, look before you answer rather than guessing, and mention file paths you relied on. Reading is all these tools do.",
        ]
          .filter((line) => line !== null)
          .join("\n")
      : "## Repository\nThis chat has no repository attached. One can be attached with the repository dropdown under the message box; after that, questions about its code can be answered.",
    buildDocumentsSection(documents),
  ]
    .filter((section) => section !== null)
    .join("\n\n");
}

/** Chat title derived from the first human message. */
export function deriveTitle(content: string) {
  const plain = stripTokens(content)
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
