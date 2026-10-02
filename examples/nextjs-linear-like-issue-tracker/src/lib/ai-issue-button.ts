import { AI_USER_INFO, getUsers } from "@/database";
import { writeFeedComplete, writeFeedStatus } from "@/lib/ai-feed-messages";
import { hideAiPresence, showAiPresence } from "@/lib/ai-remote-presence";
import {
  createButtonLinksTools,
  type AiIssueAssistantToolRunState,
} from "@/lib/ai-issue-assistant-tools";
import {
  runJevLabelsButton,
  runJevPropertiesButton,
} from "@/lib/ai-issue-button-jev";
import {
  buildButtonLinksSystemPrompt,
  type AiIssueButtonKind,
} from "@/lib/ai-issue-button-prompts";
import { BackgroundTasks } from "@/lib/background-tasks";
import { buildIssueContextMarkdown } from "@/lib/issue-context-markdown";
import { getRoomId } from "@/config";
import { liveblocks } from "@/liveblocks.server.config";
import { anthropic, AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";
import { ModelMessage, stepCountIs, streamText } from "ai";
import { nanoid } from "nanoid";

// The three sparkle buttons use two different kinds of model:
//
// - "links" needs to *generate* URLs, so it runs a small Claude model with a
//   tool it can call.
// - "properties" and "labels" are *classification* problems, so they ask
//   Jev (TypeSafe's System One model) typed questions and apply the answers
//   in code. See ai-issue-button-jev.ts.

export type AiIssueButtonRunContext = {
  roomId: string;
  feedId: string;
  kind: AiIssueButtonKind;
};

function isAllowedRequester(userId: string): boolean {
  if (userId === AI_USER_INFO.id) {
    return false;
  }
  return getUsers().some((u) => u.id === userId);
}

// Sets up context for AI buttons on page
export async function prepareAiIssueButton(input: {
  issueId: string;
  requestedByUserId: string;
  kind: AiIssueButtonKind;
}): Promise<
  { ok: true; ctx: AiIssueButtonRunContext } | { ok: false; error: string }
> {
  const { issueId, requestedByUserId, kind } = input;

  if (!isAllowedRequester(requestedByUserId)) {
    return { ok: false, error: "Invalid user." };
  }

  const roomId = getRoomId(issueId);
  const feedId = `issue-button-${kind}-${nanoid(10)}`;

  try {
    // Only the feed is awaited here: the client subscribes to it as soon as
    // this action returns. Presence and status messages happen in the run.
    await liveblocks.createFeed({
      roomId,
      feedId,
      metadata: { type: "ai-issue-button", kind },
    });

    return { ok: true, ctx: { roomId, feedId, kind } };
  } catch (err) {
    return { ok: false, error: `${err}` };
  }
}

async function streamLinksButtonToFeed(ctx: AiIssueButtonRunContext) {
  const { roomId, feedId } = ctx;

  const issueContextMd = await buildIssueContextMarkdown(roomId);

  const toolRunState: AiIssueAssistantToolRunState = {
    editorMarkdownApplied: false,
    issuePropertiesUpdated: false,
    issueLinksUpdated: false,
  };

  const userMessage: ModelMessage = {
    role: "user",
    content:
      "Find and add relevant https links for this issue using your tools.",
  };

  const result = streamText({
    // Cheap model for small button edits
    model: anthropic("claude-haiku-4-5"),
    system: buildButtonLinksSystemPrompt(issueContextMd),
    messages: [userMessage],
    stopWhen: stepCountIs(8),
    tools: createButtonLinksTools(roomId, toolRunState),
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
    } else if (part.type === "tool-result") {
      if (reportedToolCalls.has(part.toolCallId)) {
        continue;
      }
      reportedToolCalls.add(part.toolCallId);
      await writeFeedStatus({ roomId, feedId }, "Adding links…");
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
}

// Main entry point for button
export async function runAiIssueButtonStream(
  ctx: AiIssueButtonRunContext
): Promise<{ status: number; error?: string }> {
  // Presence and feed status writes never block the visible update; they are
  // collected here and flushed after the work is done.
  const background = new BackgroundTasks();
  background.add(showAiPresence(ctx.roomId));
  background.queue(() => writeFeedStatus(ctx, "Starting…"));

  try {
    switch (ctx.kind) {
      case "links":
        await streamLinksButtonToFeed(ctx);
        break;
      case "properties":
        await runJevPropertiesButton(ctx, background);
        break;
      case "labels":
        await runJevLabelsButton(ctx, background);
        break;
    }

    await background.flush();

    // Let the AI editing-type outlines linger briefly, then clear presence.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await hideAiPresence(ctx.roomId);

    return { status: 200 };
  } catch (err) {
    await background.flush();
    await hideAiPresence(ctx.roomId).catch(() => undefined);
    // Close the feed so the button stops spinning even when the model call
    // failed (e.g. a missing API key).
    await writeFeedComplete(ctx, {
      response: "",
      reasoning: "",
      thinkingTime: 0,
    }).catch(() => undefined);
    return { status: 400, error: `${err}` };
  }
}
