import { AI_USER_INFO, getUsers } from "@/database";
import {
  createAiPlaceholderComment,
  updateAiPlaceholderComment,
  type CommentLocation,
} from "@/lib/ai-comment-bridge";
import {
  writeFeedComplete,
  writeFeedThinking,
  writeFeedWriting,
} from "@/lib/ai-feed-messages";
import {
  hideAiPresence,
  leaveAiReactionOnComment,
  showAiPresence,
} from "@/lib/ai-remote-presence";
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
  type CommentData,
  type ThreadData,
} from "@liveblocks/node";
import { stringifyCommentBody } from "@liveblocks/client";
import { anthropic, AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";
import { ModelMessage, stepCountIs, streamText } from "ai";

// Entry point for the comment reply assistant
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

    const placeholderComment = await createAiPlaceholderComment({
      roomId,
      threadId,
      feedId,
    });
    const placeholderCommentLocation: CommentLocation = {
      ...commentLocation,
      commentId: placeholderComment.id,
    };

    await Promise.all([
      liveblocks.createFeed({
        roomId,
        feedId,
        metadata: {
          type: "ai-comment-reply",
          threadId,
          commentId: placeholderComment.id,
        },
      }),
      showAiPresence(roomId),
      leaveAiReactionOnComment(commentLocation),
    ]);

    const {
      response,
      referencedIssueIdsCsv,
      editorMarkdownApplied,
      issuePropertiesUpdated,
      issueLinksUpdated,
    } = await streamCommentThreadReply({ roomId, feedId, thread, comment });

    const hasOutput =
      (response !== undefined && response.trim().length > 0) ||
      (referencedIssueIdsCsv !== undefined &&
        referencedIssueIdsCsv.length > 0) ||
      editorMarkdownApplied ||
      issuePropertiesUpdated ||
      issueLinksUpdated;

    if (!hasOutput) {
      await hideAiPresence(roomId).catch(() => undefined);
      return { status: 500, error: "Failed to generate response" };
    }

    await updateAiPlaceholderComment({
      ...placeholderCommentLocation,
      feedId,
      response,
      referencedIssueIdsCsv,
    });

    // Let the last AI presence stay for a couple secs
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await hideAiPresence(roomId);

    return { status: 200, body: "AI replied to comment" };
  } catch (err) {
    await hideAiPresence(roomId).catch(() => undefined);

    return { status: 400, error: `${err}` };
  }
}

async function streamCommentThreadReply({
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
    model: anthropic("claude-haiku-4-5"),
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
  // Feed writes are fire-and-forget during streaming so model output is not paced
  // by Liveblocks API latency; we drain them before the final `complete` message.
  const feedWrites: Promise<unknown>[] = [];

  for await (const part of result.fullStream) {
    if (part.type === "reasoning-delta") {
      totalReasoning += part.text;
      feedWrites.push(
        writeFeedThinking({ roomId, feedId }, part.text, totalReasoning)
      );
    } else if (part.type === "text-delta") {
      totalText += part.text;
      feedWrites.push(
        writeFeedWriting({ roomId, feedId }, part.text, totalText)
      );
    }
  }

  const thinkingEndedAt = performance.now();
  await Promise.all(feedWrites);

  await writeFeedComplete(
    { roomId, feedId },
    {
      response: totalText,
      reasoning: totalReasoning,
      thinkingTime: (thinkingEndedAt - thinkingStartedAt) / 1000,
    }
  );

  return {
    response: totalText,
    reasoning: totalReasoning,
    referencedIssueIdsCsv: toolRunState.referencedIssueIdsCsv,
    editorMarkdownApplied: toolRunState.editorMarkdownApplied,
    issuePropertiesUpdated: toolRunState.issuePropertiesUpdated,
    issueLinksUpdated: toolRunState.issueLinksUpdated,
  };
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

async function isAiMentionedInComment(comment: CommentData) {
  if (!comment.body) {
    return false;
  }

  const mentions = getMentionsFromCommentBody(comment.body);
  return mentions.map((m) => m.id).includes(AI_USER_INFO.id);
}
