import { AI_USER_INFO, getUsers } from "@/database";
import {
  createAiIssueAssistantTools,
  type AiIssueAssistantToolRunState,
} from "@/lib/ai-issue-assistant-tools";
import { buildIssueContextMarkdown } from "@/lib/issue-context-markdown";
import { ISSUE_LABEL_IDS } from "@/lib/issue-storage-enums";
import { liveblocks } from "@/liveblocks.server.config";
import {
  getMentionsFromCommentBody,
  type CommentBodyParagraph,
  type CommentData,
  type ThreadData,
} from "@liveblocks/node";
import { stringifyCommentBody } from "@liveblocks/client";
import { anthropic, AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";
import { ModelMessage, stepCountIs, streamText } from "ai";

export type CommentLocation = {
  roomId: string;
  threadId: string;
  commentId: string;
};

export async function runAiIssueAssistant(
  commentLocation: CommentLocation
): Promise<{ status: number; body?: string; error?: string }> {
  const { roomId, threadId, commentId } = commentLocation;
  const feedId = `comment-reply-${roomId}-${threadId}-${commentId}`;

  try {
    const { thread, comment } = await getThreadAndComment(commentLocation);

    if (!thread || !comment) {
      throw new Error("Thread or comment not found");
    }

    if (!comment.body) {
      throw new Error("Comment deleted");
    }

    if (!(await isAiMentionedInComment(comment))) {
      return { status: 200, body: "AI is not mentioned in the comment" };
    }

    const placeholderComment = await createPlaceholderComment({
      ...commentLocation,
      feedId,
    });
    const placeholderCommentLocation: CommentLocation = {
      ...commentLocation,
      commentId: placeholderComment.id,
    };

    await Promise.all([
      createFeed({ feedId, ...placeholderCommentLocation }),
      showPresence(commentLocation),
      leaveReactionOnComment(commentLocation),
    ]);

    const {
      response,
      createdIssueId,
      editorMarkdownApplied,
      issuePropertiesUpdated,
    } = await streamResponse({ roomId, feedId, thread, comment });

    const hasOutput =
      (response !== undefined && response.trim().length > 0) ||
      createdIssueId !== undefined ||
      editorMarkdownApplied ||
      issuePropertiesUpdated;

    if (!hasOutput) {
      return { status: 500, error: "Failed to generate response" };
    }

    await updatePlaceholderComment({
      ...placeholderCommentLocation,
      feedId,
      response,
      createdIssueId,
    });

    await hidePresence(commentLocation);

    return { status: 200, body: "AI replied to comment" };
  } catch (err) {
    await hidePresence(commentLocation).catch(() => undefined);

    return { status: 400, error: `${err}` };
  }
}

async function createFeed({
  roomId,
  threadId,
  commentId,
  feedId,
}: {
  roomId: string;
  threadId: string;
  feedId: string;
  commentId: string;
}) {
  return await liveblocks.createFeed({
    roomId,
    feedId,
    metadata: { type: "ai-comment-reply", threadId, commentId },
  });
}

async function streamResponse({
  roomId,
  feedId,
  thread,
  comment,
}: {
  roomId: string;
  feedId: string;
  thread: ThreadData;
  comment: CommentData;
}) {
  const stringifiedComment = comment.body
    ? await stringifyCommentBody(comment.body)
    : "Deleted comment";

  const issueContextMd = await buildIssueContextMarkdown(roomId);

  const assignableUsersLines = getUsers()
    .filter((u) => u.id !== AI_USER_INFO.id)
    .map(
      (u) =>
        `- \`${u.id}\` — ${typeof u.info === "object" && u.info && "name" in u.info ? String(u.info.name) : u.id}`
    )
    .join("\n");

  const allUsersLines = getUsers()
    .map((u) => {
      const name =
        typeof u.info === "object" && u.info && "name" in u.info
          ? String(u.info.name)
          : u.id;
      const tag = u.id === AI_USER_INFO.id ? " — assistant" : "";
      return `- \`${u.id}\` — ${name}${tag}`;
    })
    .join("\n");

  const labelIdsForPrompt = ISSUE_LABEL_IDS.join(", ");

  const toolRunState: AiIssueAssistantToolRunState = {
    editorMarkdownApplied: false,
    issuePropertiesUpdated: false,
  };

  const system = `You are an assistant that helps collaborators on issues in a Linear-like tracker.

## Info

- Threads are comments on a single issue.
- Your user ID is: ${AI_USER_INFO.id}
- Thread messages are prefixed with user id and time.
- You may create a new issue with the **create_issue** tool when the user clearly asks for a new ticket, bug, task, or follow-up item that should be tracked separately. That tool can set an initial **description** (markdown), **labels** (ids: ${labelIdsForPrompt}), **links** (URLs), and **progress** / **priority** / **assignedTo** in one step — use those fields when the user wants them on the new issue so you do not rely on a second room. Put the summary in **title**; **descriptionMarkdown** should be body-only (no leading \`#\` title that duplicates **title**).
- You **can** edit the **issue description** (the main Lexical document): call **insert_issue_description_markdown** with GitHub-flavored markdown (headings, lists, links, quotes, fenced code). Use **append** to add at the end; use **replace** only when the user explicitly wants to overwrite the whole description. The issue **title** is a separate field shown above the body (like an H1) — do **not** open the description with a top-level title that repeats it.
- You **can** set **assignee**: call **update_issue_properties** with \`assignedTo\`. Use \`none\` to clear. Otherwise use an exact id from the list below. Thread messages are prefixed with \`userId at …\` — use that id when the user says "me", "assign to me", or refers to the author of a message.
- You may update other **issue fields** (title, progress, priority, labels) with **update_issue_properties**. Only include keys you are changing.

**Assignable users** — use the exact \`id\` for \`assignedTo\` (create_issue or update_issue_properties), or \`none\` to clear:

${assignableUsersLines.length > 0 ? assignableUsersLines : "_No human users in this demo database._"}

## All users (ids and display names)

Use these ids in thread context, assignees, and mentions:

${allUsersLines}

- Below, **Current issue** is markdown exported from the issue editor and fields (for grounding). Comment bodies in the thread are plain text.

## Rules

- Your **thread reply** (what collaborators read in the comment) must be **plain text only** — no markdown there. That does **not** restrict tools: **insert_issue_description_markdown** requires markdown for the issue body; use it whenever the user wants description content added or replaced.
- You MUST reply concisely and to the point.
- You MUST NOT start your messages with "${AI_USER_INFO.id} at ...".
- Call create_issue at most once per reply. If you create an issue, briefly acknowledge it in plain text.
- Prefer **append** for description edits unless the user clearly asked to replace the entire document.
- For **insert_issue_description_markdown** and **create_issue**’s \`descriptionMarkdown\`: start with real body content (paragraphs, \`##\` subsections, lists, etc.). Do **not** begin with a single \`# …\` (or bold line) that repeats the issue title — the UI already shows the title above the editor.
- Your avatar is already shown in the room while you work (presence); collaborators see it during description or property edits too.

## Current issue (markdown)

${issueContextMd}

## Respond

Respond to the following comment:

${stringifiedComment}
`;

  const messages: ModelMessage[] = [];

  for (const c of thread.comments) {
    const buildMessageContent = (content: string) =>
      `${c.userId} at ${c.createdAt}:

${content}
`;
    messages.push({
      role: c.userId === AI_USER_INFO.id ? "assistant" : "user",
      content: c.body
        ? buildMessageContent(await stringifyCommentBody(c.body))
        : buildMessageContent("Deleted comment"),
    });
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-5"),
    system,
    messages,
    stopWhen: stepCountIs(12),
    tools: createAiIssueAssistantTools(roomId, toolRunState),
    providerOptions: {
      anthropic: {
        sendReasoning: true,
        thinking: { type: "enabled", budgetTokens: 10000 },
      } satisfies AnthropicLanguageModelOptions,
    },
  });

  let totalReasoning = "";
  let totalText = "";
  const thinkingStartedAt = performance.now();
  const promises: Promise<unknown>[] = [];

  for await (const part of result.fullStream) {
    if (part.type === "reasoning-delta") {
      totalReasoning += part.text;

      promises.push(
        liveblocks.createFeedMessage({
          roomId,
          feedId,
          data: {
            stage: "thinking",
            responsePart: part.text,
            response: totalReasoning,
          },
        })
      );
    } else if (part.type === "text-delta") {
      totalText += part.text;

      promises.push(
        liveblocks.createFeedMessage({
          roomId,
          feedId,
          data: {
            stage: "writing",
            responsePart: part.text,
            response: totalText,
          },
        })
      );
    }
  }

  const thinkingEndedAt = performance.now();
  await Promise.all(promises);

  await liveblocks.createFeedMessage({
    roomId,
    feedId,
    data: {
      stage: "complete",
      response: totalText,
      reasoning: totalReasoning,
      thinkingTime: (thinkingEndedAt - thinkingStartedAt) / 1000,
    },
  });

  return {
    response: totalText,
    reasoning: totalReasoning,
    createdIssueId: toolRunState.createdIssueId,
    editorMarkdownApplied: toolRunState.editorMarkdownApplied,
    issuePropertiesUpdated: toolRunState.issuePropertiesUpdated,
  };
}

async function showPresence({ roomId }: CommentLocation) {
  return liveblocks.setPresence(roomId, {
    userId: AI_USER_INFO.id,
    userInfo: AI_USER_INFO.info,
    data: {},
    ttl: 3599,
  });
}

async function hidePresence({ roomId }: CommentLocation) {
  return liveblocks.setPresence(roomId, {
    ttl: 2,
    userId: AI_USER_INFO.id,
    userInfo: AI_USER_INFO.info,
    data: {},
  });
}

async function getThreadAndComment({
  roomId,
  threadId,
  commentId,
}: CommentLocation) {
  const thread = await liveblocks.getThread({ roomId, threadId });
  const c = thread?.comments.find((x) => x.id === commentId);
  return { thread, comment: c };
}

async function leaveReactionOnComment({
  roomId,
  threadId,
  commentId,
}: CommentLocation) {
  return liveblocks.addCommentReaction({
    roomId,
    threadId,
    commentId,
    data: { emoji: "👀", userId: AI_USER_INFO.id, createdAt: new Date() },
  });
}

async function isAiMentionedInComment(comment: CommentData) {
  if (!comment.body) {
    return false;
  }

  const mentions = getMentionsFromCommentBody(comment.body);
  return mentions.map((m) => m.id).includes(AI_USER_INFO.id);
}

async function createPlaceholderComment({
  roomId,
  threadId,
  feedId,
}: CommentLocation & { feedId: string }) {
  return await liveblocks.createComment({
    roomId,
    threadId,
    data: {
      userId: AI_USER_INFO.id,
      metadata: { feedId },
      body: {
        version: 1,
        content: [
          { type: "paragraph", children: [{ text: "Placeholder for a feed" }] },
        ],
      },
    },
  });
}

async function updatePlaceholderComment({
  roomId,
  threadId,
  commentId,
  feedId,
  response,
  createdIssueId,
}: CommentLocation & {
  feedId: string;
  response: string;
  createdIssueId?: string;
}) {
  const bodyText = response.trim();
  const content: CommentBodyParagraph[] =
    bodyText.length === 0
      ? [{ type: "paragraph", children: [{ text: "\u00a0" }] }]
      : bodyText
          .split("\n\n")
          .map((line) => ({ type: "paragraph", children: [{ text: line }] }));

  return await liveblocks.editComment({
    roomId,
    threadId,
    commentId,
    data: {
      metadata: {
        feedId,
        ...(createdIssueId !== undefined ? { createdIssueId } : {}),
      },
      body: { version: 1, content },
    },
  });
}
