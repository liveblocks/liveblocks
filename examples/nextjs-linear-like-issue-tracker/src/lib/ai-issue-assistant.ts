import { AI_USER_INFO, getUsers } from "@/database";
import {
  createAiIssueAssistantTools,
  type AiIssueAssistantToolRunState,
} from "@/lib/ai-issue-assistant-tools";
import { buildAiIssueAssistantSystemPrompt } from "@/lib/ai-issue-assistant-prompt";
import { buildIssueContextMarkdown } from "@/lib/issue-context-markdown";
import { getIssueId } from "@/config";
import { liveblocks } from "@/liveblocks.server.config";
import {
  getMentionsFromCommentBody,
  markdownToCommentBody,
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
      referencedIssueId,
      editorMarkdownApplied,
      issuePropertiesUpdated,
      issueLinksUpdated,
    } = await streamResponse({ roomId, feedId, thread, comment });

    const hasOutput =
      (response !== undefined && response.trim().length > 0) ||
      createdIssueId !== undefined ||
      referencedIssueId !== undefined ||
      editorMarkdownApplied ||
      issuePropertiesUpdated ||
      issueLinksUpdated;

    if (!hasOutput) {
      await hidePresence(commentLocation).catch(() => undefined);
      return { status: 500, error: "Failed to generate response" };
    }

    await updatePlaceholderComment({
      ...placeholderCommentLocation,
      feedId,
      response,
      createdIssueId,
      referencedIssueId,
    });

    // Let editing-type outlines linger briefly, then clear presence in-process.
    // A fire-and-forget `setTimeout` often never runs after the route returns (serverless).
    await new Promise((resolve) => setTimeout(resolve, 2000));
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

  const toolRunState: AiIssueAssistantToolRunState = {
    editorMarkdownApplied: false,
    issuePropertiesUpdated: false,
    issueLinksUpdated: false,
  };

  const system = buildAiIssueAssistantSystemPrompt({
    aiUserId: AI_USER_INFO.id,
    currentIssueId: getIssueId(roomId),
    assignableUsersLines,
    allUsersLines,
    issueContextMd,
    stringifiedComment,
  });

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
    stopWhen: stepCountIs(16),
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
    referencedIssueId: toolRunState.referencedIssueId,
    editorMarkdownApplied: toolRunState.editorMarkdownApplied,
    issuePropertiesUpdated: toolRunState.issuePropertiesUpdated,
    issueLinksUpdated: toolRunState.issueLinksUpdated,
  };
}

async function showPresence({ roomId }: CommentLocation) {
  return liveblocks.setPresence(roomId, {
    userId: AI_USER_INFO.id,
    userInfo: { ...AI_USER_INFO.info },
    data: { editingTypes: [] },
    ttl: 3599,
  });
}

async function hidePresence({ roomId }: CommentLocation) {
  return liveblocks.setPresence(roomId, {
    ttl: 2,
    userId: AI_USER_INFO.id,
    userInfo: { ...AI_USER_INFO.info },
    data: { editingTypes: [] },
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
      body: markdownToCommentBody("Placeholder for a feed"),
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
  referencedIssueId,
}: CommentLocation & {
  feedId: string;
  response: string;
  createdIssueId?: string;
  referencedIssueId?: string;
}) {
  const trimmed = response.trim();
  const body =
    trimmed.length === 0
      ? {
          version: 1 as const,
          content: [
            { type: "paragraph" as const, children: [{ text: "\u00a0" }] },
          ],
        }
      : markdownToCommentBody(trimmed);

  return await liveblocks.editComment({
    roomId,
    threadId,
    commentId,
    data: {
      metadata: {
        feedId,
        ...(createdIssueId !== undefined ? { createdIssueId } : {}),
        ...(referencedIssueId !== undefined ? { referencedIssueId } : {}),
      },
      body,
    },
  });
}
