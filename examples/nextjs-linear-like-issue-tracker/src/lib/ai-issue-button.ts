import { AI_USER_INFO, getUsers } from "@/database";
import {
  writeFeedComplete,
  writeFeedStatus,
} from "@/lib/ai-feed-messages";
import { hideAiPresence, showAiPresence } from "@/lib/ai-remote-presence";
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
import { anthropic, AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";
import { ModelMessage, stepCountIs, streamText } from "ai";
import { nanoid } from "nanoid";

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
  | { ok: true; ctx: AiIssueButtonRunContext }
  | { ok: false; error: string }
> {
  const { issueId, requestedByUserId, kind } = input;

  if (!isAllowedRequester(requestedByUserId)) {
    return { ok: false, error: "Invalid user." };
  }

  const roomId = getRoomId(issueId);
  const feedId = `issue-button-${kind}-${nanoid(10)}`;

  try {
    await Promise.all([
      liveblocks.createFeed({
        roomId,
        feedId,
        metadata: { type: "ai-issue-button", kind },
      }),
      showAiPresence(roomId),
    ]);

    await writeFeedStatus({ roomId, feedId }, "Starting…");

    return { ok: true, ctx: { roomId, feedId, kind } };
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

async function streamButtonToFeed(ctx: AiIssueButtonRunContext) {
  const { roomId, feedId, kind } = ctx;

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
            "Find and add relevant https links for this issue using your tools.",
        }
      : kind === "properties"
        ? {
            role: "user",
            content:
              "Fill in missing progress, priority, and/or assignee using your tools.",
          }
        : {
            role: "user",
            content: "Set appropriate labels using your tools.",
          };

  const tools =
    kind === "links"
      ? createButtonLinksTools(roomId, toolRunState)
      : kind === "properties"
        ? createButtonPropertiesTools(roomId, toolRunState)
        : createButtonLabelsTools(roomId, toolRunState);

  const result = streamText({
    // Cheap model for small button edits
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
}

// Main entry point for button
export async function runAiIssueButtonStream(
  ctx: AiIssueButtonRunContext
): Promise<{ status: number; error?: string }> {
  try {
    await streamButtonToFeed(ctx);

    // Let the AI editing-type outlines linger briefly, then clear presence.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await hideAiPresence(ctx.roomId);

    return { status: 200 };
  } catch (err) {
    await hideAiPresence(ctx.roomId).catch(() => undefined);
    return { status: 400, error: `${err}` };
  }
}
