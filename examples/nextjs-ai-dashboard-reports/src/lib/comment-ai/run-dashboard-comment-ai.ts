import { AI_USER_INFO } from "@/app/api/database";
import { buildDashboardCommentSystemPrompt } from "@/lib/comment-ai/build-dashboard-comment-system-prompt";
import { createDashboardCommentAiTools } from "@/lib/comment-ai/dashboard-comment-ai-tools";
import { stringifyCommentBody } from "@liveblocks/client";
import {
  getMentionsFromCommentBody,
  Liveblocks,
  type CommentBodyParagraph,
  type CommentData,
  type ThreadData,
} from "@liveblocks/node";
import { anthropic, AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";
import { ModelMessage, stepCountIs, streamText } from "ai";

export type CommentLocation = {
  roomId: string;
  threadId: string;
  commentId: string;
};

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function runDashboardCommentAiReply(
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
    const placeholderCommentLocation = {
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
      showPresence(commentLocation),
      leaveReactionOnComment(commentLocation),
    ]);

    const { response } = await streamResponse({
      roomId,
      feedId,
      thread,
      comment,
    });

    if (!response) {
      await hidePresence(commentLocation);
      return { status: 500, error: "Failed to generate response" };
    }

    await updatePlaceholderComment({
      ...placeholderCommentLocation,
      feedId,
      response,
    });

    await hidePresence(commentLocation);

    return { status: 200, body: "AI replied to comment" };
  } catch (err) {
    await hidePresence(commentLocation).catch(() => undefined);

    return { status: 400, error: `${err}` };
  }
}

function resolvePathnameForPrompt(
  thread: ThreadData,
  comment: CommentData
): string | undefined {
  const threadMeta = thread.metadata as { pathname?: string } | undefined;
  if (threadMeta?.pathname) {
    return threadMeta.pathname;
  }

  const commentMeta = comment.metadata as { pathname?: string } | undefined;
  if (commentMeta?.pathname) {
    return commentMeta.pathname;
  }

  return undefined;
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

  const system = buildDashboardCommentSystemPrompt(
    stringifiedComment,
    resolvePathnameForPrompt(thread, comment)
  );

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
    tools: createDashboardCommentAiTools(),
    stopWhen: stepCountIs(16),
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
  const feedWrites: Promise<unknown>[] = [];

  for await (const part of result.fullStream) {
    if (part.type === "reasoning-delta") {
      totalReasoning += part.text;

      feedWrites.push(
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

      feedWrites.push(
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

  await Promise.all(feedWrites);

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

  return { response: totalText, reasoning: totalReasoning };
}

async function showPresence({ roomId }: CommentLocation) {
  return liveblocks.setPresence(roomId, {
    userId: AI_USER_INFO.id,
    userInfo: AI_USER_INFO,
    data: {},
  });
}

async function hidePresence({ roomId }: CommentLocation) {
  return liveblocks.setPresence(roomId, {
    ttl: 2,
    userId: AI_USER_INFO.id,
    userInfo: AI_USER_INFO,
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
    data: {
      emoji: "👀",
      userId: AI_USER_INFO.id,
      createdAt: new Date(),
    },
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
}: CommentLocation & {
  feedId: string;
}) {
  return await liveblocks.createComment({
    roomId,
    threadId,
    data: {
      userId: AI_USER_INFO.id,
      metadata: { feedId, feedComplete: false },
      body: {
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "Thinking…" }],
          },
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
}: CommentLocation & {
  feedId: string;
  response: string;
}) {
  const content: CommentBodyParagraph[] = response.split("\n\n").map((line) => ({
    type: "paragraph",
    children: [{ text: line }],
  }));

  return await liveblocks.editComment({
    roomId,
    threadId,
    commentId,
    data: {
      metadata: { feedId, feedComplete: true },
      body: {
        version: 1,
        content,
      },
    },
  });
}
