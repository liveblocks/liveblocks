import { AI_USER_INFO, getUsers } from "@/database";
import {
  createAiPlaceholderComment,
  updateAiPlaceholderComment,
  type CommentLocation,
} from "@/lib/ai-comment-bridge";
import {
  writeFeedComplete,
  writeFeedStatus,
} from "@/lib/ai-feed-messages";
import {
  hideAiPresence,
  leaveAiReactionOnComment,
  showAiPresence,
} from "@/lib/ai-remote-presence";
import {
  createButtonLabelsTools,
  createButtonLinksTools,
  createButtonPropertiesTools,
  type AiIssueAssistantToolRunState,
} from "@/lib/ai-issue-assistant-tools";
import {
  buildButtonLabelsSystemPrompt,
  buildButtonLinksSystemPrompt,
  buildButtonPropertiesSystemPrompt,
  type AiIssueButtonKind,
} from "@/lib/ai-issue-button-prompts";
import { buildIssueContextMarkdown } from "@/lib/issue-context-markdown";
import { getRoomId } from "@/config";
import { liveblocks } from "@/liveblocks.server.config";
import { markdownToCommentBody } from "@liveblocks/node";
import { anthropic, AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";
import { ModelMessage, stepCountIs, streamText } from "ai";
import { nanoid } from "nanoid";

export type AiIssueButtonRunContext = {
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

function threadStubMarkdown(kind: AiIssueButtonKind): string {
  switch (kind) {
    case "links":
      return "**AI: add links** — find relevant https URLs for this issue.";
    case "properties":
      return "**AI: fill properties** — set missing progress, priority, or assignee.";
    case "labels":
      return "**AI: fill labels** — choose appropriate labels.";
  }
}

// Sets up context for AI buttons on page
export async function prepareAiIssueButton(input: {
  issueId: string;
  requestedByUserId: string;
  kind: AiIssueButtonKind;
}): Promise<
  | { ok: true; ctx: AiIssueButtonRunContext }
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

    const feedId = `issue-button-${kind}-${nanoid(10)}`;

    const placeholder = await createAiPlaceholderComment({
      roomId,
      threadId: thread.id,
      feedId,
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
          type: "ai-issue-button",
          kind,
          threadId: thread.id,
          commentId: placeholder.id,
        },
      }),
      showAiPresence(roomId),
      leaveAiReactionOnComment(presenceCommentLocation),
    ]);

    await writeFeedStatus({ roomId, feedId }, "Starting…");

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

function statusLabelsForToolInput(toolName: string, input: unknown): string[] {
  if (toolName === "append_issue_links") {
    return ["Adding links…"];
  }
  if (toolName === "update_issue_labels") {
    return ["Updating labels…"];
  }
  if (toolName === "update_issue_properties") {
    if (!input || typeof input !== "object") {
      return ["Updating…"];
    }
    const o = input as Record<string, unknown>;
    const ordered: [string, string][] = [
      ["assignedTo", "Assigning user…"],
      ["priority", "Updating priority…"],
      ["progress", "Updating progress…"],
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

async function streamButtonToFeed(
  ctx: AiIssueButtonRunContext,
  kind: AiIssueButtonKind
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
      ? buildButtonLinksSystemPrompt(issueContextMd)
      : kind === "properties"
        ? buildButtonPropertiesSystemPrompt(
            issueContextMd,
            assignableUsersLines
          )
        : buildButtonLabelsSystemPrompt(issueContextMd);

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
      ? createButtonLinksTools(roomId, toolRunState)
      : kind === "properties"
        ? createButtonPropertiesTools(roomId, toolRunState)
        : createButtonLabelsTools(roomId, toolRunState);

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
        await writeFeedStatus({ roomId, feedId }, "Thinking…");
      }
    } else if (part.type === "text-delta") {
      totalText += part.text;
      if (!sentWriting) {
        sentWriting = true;
        await writeFeedStatus({ roomId, feedId }, "Writing…");
      }
    } else if (part.type === "tool-result") {
      if (reportedToolCalls.has(part.toolCallId)) {
        continue;
      }
      reportedToolCalls.add(part.toolCallId);
      const labels = statusLabelsForToolInput(part.toolName, part.input);
      for (const label of labels) {
        await writeFeedStatus({ roomId, feedId }, label);
      }
    }
  }

  const thinkingEndedAt = performance.now();

  await writeFeedStatus({ roomId, feedId }, "Done…");

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
    referencedIssueIdsCsv: toolRunState.referencedIssueIdsCsv,
    issuePropertiesUpdated: toolRunState.issuePropertiesUpdated,
    issueLinksUpdated: toolRunState.issueLinksUpdated,
  };
}

// Main entry point for the button
export async function runAiIssueButtonStream(
  ctx: AiIssueButtonRunContext,
  kind: AiIssueButtonKind
): Promise<{ status: number; error?: string }> {
  try {
    const {
      response,
      referencedIssueIdsCsv,
      issuePropertiesUpdated,
      issueLinksUpdated,
    } = await streamButtonToFeed(ctx, kind);

    const textOut = response !== undefined && response.trim().length > 0;
    const hasOutput =
      kind === "links"
        ? issueLinksUpdated || textOut
        : issuePropertiesUpdated || textOut;

    if (!hasOutput) {
      await hideAiPresence(ctx.roomId).catch(() => undefined);
      await updateAiPlaceholderComment({
        ...ctx.placeholderCommentLocation,
        feedId: ctx.feedId,
        response: "_Nothing was updated._",
      }).catch(() => undefined);
      return { status: 500, error: "No output" };
    }

    await updateAiPlaceholderComment({
      ...ctx.placeholderCommentLocation,
      feedId: ctx.feedId,
      response,
      referencedIssueIdsCsv,
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
    await hideAiPresence(ctx.roomId);

    return { status: 200 };
  } catch (err) {
    await hideAiPresence(ctx.roomId).catch(() => undefined);
    const msg = `${err}`;
    await updateAiPlaceholderComment({
      ...ctx.placeholderCommentLocation,
      feedId: ctx.feedId,
      response: `_Something went wrong: ${msg}_`,
    }).catch(() => undefined);
    return { status: 400, error: msg };
  }
}
