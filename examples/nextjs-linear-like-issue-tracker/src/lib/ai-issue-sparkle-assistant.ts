import { AI_USER_INFO, getUsers } from "@/database";
import {
  updatePlaceholderComment,
  type CommentLocation,
} from "@/lib/ai-issue-assistant";
import {
  createAiIssueLabelsOnlyTools,
  createAiIssueLinksOnlyTools,
  createAiIssuePropertiesOnlyTools,
  type AiIssueAssistantToolRunState,
} from "@/lib/ai-issue-assistant-tools";
import {
  buildSparkleLabelsSystemPrompt,
  buildSparkleLinksSystemPrompt,
  buildSparklePropertiesSystemPrompt,
  type AiIssueSparkleKind,
} from "@/lib/ai-issue-sparkle-prompts";
import { buildIssueContextMarkdown } from "@/lib/issue-context-markdown";
import { getRoomId } from "@/config";
import { liveblocks } from "@/liveblocks.server.config";
import { markdownToCommentBody } from "@liveblocks/node";
import { anthropic, AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";
import { ModelMessage, stepCountIs, streamText } from "ai";
import { nanoid } from "nanoid";

export type AiIssueSparkleRunContext = {
  roomId: string;
  feedId: string;
  placeholderCommentLocation: CommentLocation;
  presenceCommentLocation: CommentLocation;
};

function isAllowedRequester(userId: string): boolean {
  if (userId === AI_USER_INFO.id) {
    return false;
  }
  return getUsers().some((u) => u.id === userId);
}

function threadStubMarkdown(kind: AiIssueSparkleKind): string {
  switch (kind) {
    case "links":
      return "**AI: add links** — find relevant https URLs for this issue.";
    case "properties":
      return "**AI: fill properties** — set missing progress, priority, or assignee.";
    case "labels":
      return "**AI: fill labels** — choose appropriate labels.";
  }
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

async function leaveReactionOnComment(loc: CommentLocation) {
  return liveblocks.addCommentReaction({
    roomId: loc.roomId,
    threadId: loc.threadId,
    commentId: loc.commentId,
    data: { emoji: "👀", userId: AI_USER_INFO.id, createdAt: new Date() },
  });
}

export async function prepareAiIssueSparkle(input: {
  issueId: string;
  requestedByUserId: string;
  kind: AiIssueSparkleKind;
}): Promise<
  | { ok: true; ctx: AiIssueSparkleRunContext }
  | { ok: false; error: string }
> {
  const { issueId, requestedByUserId, kind } = input;

  if (!isAllowedRequester(requestedByUserId)) {
    return { ok: false, error: "Invalid user." };
  }

  const roomId = getRoomId(issueId);

  try {
    const thread = await liveblocks.createThread({
      roomId,
      data: {
        comment: {
          userId: requestedByUserId,
          body: markdownToCommentBody(threadStubMarkdown(kind)),
        },
      },
    });

    const first = thread.comments[0];
    if (!first?.id) {
      return { ok: false, error: "Thread created without first comment." };
    }

    const feedId = `issue-sparkle-${kind}-${nanoid(10)}`;

    const placeholder = await liveblocks.createComment({
      roomId,
      threadId: thread.id,
      data: {
        userId: AI_USER_INFO.id,
        metadata: { feedId },
        body: markdownToCommentBody("Placeholder for a feed"),
      },
    });

    const placeholderCommentLocation: CommentLocation = {
      roomId,
      threadId: thread.id,
      commentId: placeholder.id,
    };

    const presenceCommentLocation: CommentLocation = {
      roomId,
      threadId: thread.id,
      commentId: first.id,
    };

    await Promise.all([
      liveblocks.createFeed({
        roomId,
        feedId,
        metadata: {
          type: "ai-issue-sparkle",
          kind,
          threadId: thread.id,
          commentId: placeholder.id,
        },
      }),
      showPresence(presenceCommentLocation),
      leaveReactionOnComment(presenceCommentLocation),
    ]);

    await liveblocks.createFeedMessage({
      roomId,
      feedId,
      data: {
        stage: "status",
        label: "Starting…",
      },
    });

    return {
      ok: true,
      ctx: {
        roomId,
        feedId,
        placeholderCommentLocation,
        presenceCommentLocation,
      },
    };
  } catch (err) {
    return { ok: false, error: `${err}` };
  }
}

async function sendSparkleStatusMessage(
  roomId: string,
  feedId: string,
  label: string
) {
  await liveblocks.createFeedMessage({
    roomId,
    feedId,
    data: { stage: "status", label },
  });
}

function statusLabelsForToolInput(toolName: string, input: unknown): string[] {
  if (toolName === "append_issue_links") {
    return ["Adding links…"];
  }
  if (toolName === "update_issue_properties") {
    if (!input || typeof input !== "object") {
      return ["Updating…"];
    }
    const o = input as Record<string, unknown>;
    const ordered: [string, string][] = [
      ["title", "Updating title…"],
      ["assignedTo", "Assigning user…"],
      ["priority", "Updating priority…"],
      ["progress", "Updating progress…"],
      ["labels", "Updating labels…"],
    ];
    const out: string[] = [];
    for (const [key, label] of ordered) {
      if (o[key] !== undefined) {
        out.push(label);
      }
    }
    return out.length > 0 ? out : ["Updating…"];
  }
  return [`Running ${toolName}…`];
}

async function streamSparkleToFeed(
  ctx: AiIssueSparkleRunContext,
  kind: AiIssueSparkleKind
) {
  const { roomId, feedId } = ctx;

  const issueContextMd = await buildIssueContextMarkdown(roomId);

  const assignableUsersLines = getUsers()
    .filter((u) => u.id !== AI_USER_INFO.id)
    .map(
      (u) =>
        `- \`${u.id}\` — ${typeof u.info === "object" && u.info && "name" in u.info ? String(u.info.name) : u.id}`
    )
    .join("\n");

  const toolRunState: AiIssueAssistantToolRunState = {
    editorMarkdownApplied: false,
    issuePropertiesUpdated: false,
    issueLinksUpdated: false,
  };

  const system =
    kind === "links"
      ? buildSparkleLinksSystemPrompt(issueContextMd)
      : kind === "properties"
        ? buildSparklePropertiesSystemPrompt(
            issueContextMd,
            assignableUsersLines
          )
        : buildSparkleLabelsSystemPrompt(issueContextMd);

  const userMessage: ModelMessage =
    kind === "links"
      ? {
          role: "user",
          content:
            "Find and add relevant https links for this issue using your tools, then reply briefly.",
        }
      : kind === "properties"
        ? {
            role: "user",
            content:
              "Fill in missing progress, priority, and/or assignee using your tools, then reply briefly.",
          }
        : {
            role: "user",
            content:
              "Set appropriate labels using your tools, then reply briefly.",
          };

  const tools =
    kind === "links"
      ? createAiIssueLinksOnlyTools(roomId, toolRunState)
      : kind === "properties"
        ? createAiIssuePropertiesOnlyTools(roomId, toolRunState)
        : createAiIssueLabelsOnlyTools(roomId, toolRunState);

  const result = streamText({
    // Haiku for cost/latency vs Sonnet; extended thinking kept so reasoning streams into comments.
    model: anthropic("claude-haiku-4-5"),
    system,
    messages: [userMessage],
    stopWhen: stepCountIs(8),
    tools,
    providerOptions: {
      anthropic: {
        sendReasoning: true,
        thinking: { type: "enabled", budgetTokens: 8000 },
      } satisfies AnthropicLanguageModelOptions,
    },
  });

  let totalReasoning = "";
  let totalText = "";
  const thinkingStartedAt = performance.now();

  let sentThinking = false;
  let sentWriting = false;
  const reportedToolCalls = new Set<string>();

  for await (const part of result.fullStream) {
    if (part.type === "reasoning-delta") {
      totalReasoning += part.text;
      if (!sentThinking) {
        sentThinking = true;
        await sendSparkleStatusMessage(roomId, feedId, "Thinking…");
      }
    } else if (part.type === "text-delta") {
      totalText += part.text;
      if (!sentWriting) {
        sentWriting = true;
        await sendSparkleStatusMessage(roomId, feedId, "Writing…");
      }
    } else if (part.type === "tool-result") {
      if (reportedToolCalls.has(part.toolCallId)) {
        continue;
      }
      reportedToolCalls.add(part.toolCallId);
      const labels = statusLabelsForToolInput(part.toolName, part.input);
      for (const label of labels) {
        await sendSparkleStatusMessage(roomId, feedId, label);
      }
    }
  }

  const thinkingEndedAt = performance.now();

  await sendSparkleStatusMessage(roomId, feedId, "Done…");

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
    referencedIssueIdsCsv: toolRunState.referencedIssueIdsCsv,
    issuePropertiesUpdated: toolRunState.issuePropertiesUpdated,
    issueLinksUpdated: toolRunState.issueLinksUpdated,
  };
}

export async function runAiIssueSparkleStream(
  ctx: AiIssueSparkleRunContext,
  kind: AiIssueSparkleKind
): Promise<{ status: number; error?: string }> {
  try {
    const {
      response,
      referencedIssueIdsCsv,
      issuePropertiesUpdated,
      issueLinksUpdated,
    } = await streamSparkleToFeed(ctx, kind);

    const textOut = response !== undefined && response.trim().length > 0;
    const hasOutput =
      kind === "links"
        ? issueLinksUpdated || textOut
        : issuePropertiesUpdated || textOut;

    if (!hasOutput) {
      await hidePresence(ctx.presenceCommentLocation).catch(() => undefined);
      await updatePlaceholderComment({
        ...ctx.placeholderCommentLocation,
        feedId: ctx.feedId,
        response: "_Nothing was updated._",
      }).catch(() => undefined);
      return { status: 500, error: "No output" };
    }

    await updatePlaceholderComment({
      ...ctx.placeholderCommentLocation,
      feedId: ctx.feedId,
      response,
      referencedIssueIdsCsv,
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
    await hidePresence(ctx.presenceCommentLocation);

    return { status: 200 };
  } catch (err) {
    await hidePresence(ctx.presenceCommentLocation).catch(() => undefined);
    const msg = `${err}`;
    await updatePlaceholderComment({
      ...ctx.placeholderCommentLocation,
      feedId: ctx.feedId,
      response: `_Something went wrong: ${msg}_`,
    }).catch(() => undefined);
    return { status: 400, error: msg };
  }
}
