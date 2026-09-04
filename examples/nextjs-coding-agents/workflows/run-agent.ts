import {
  Agent,
  AgentBusyError,
  CursorSdkError,
  type RunResult,
  type SDKAgent,
  type SDKMessage,
} from "@cursor/sdk";
import { AI_USER_ID, getUser } from "@/app/database";
import { buildPrompt, deriveTitle } from "@/lib/prompt";
import { getCursorAgentIdForFeed, getCursorApiKey } from "@/lib/server/cursor";
import { getLiveblocks } from "@/lib/server/liveblocks";
import { normalizeToolName, summarizeToolCall } from "@/lib/tool-calls";
import type { AgentPart, ChatMessage, ChatMessageData } from "@/lib/types";

type ChatLocation = { roomId: string; feedId: string };

type Claim = {
  cursorAgentId?: string;
  model: string;
  repoUrl: string;
  repoRef: string;
  title: string;
};

type RunInput = ChatLocation & {
  agentMessageId: string;
  prompt: string;
  parts: AgentPart[];
  cursorAgentId?: string;
  model: string;
  repoUrl: string;
  repoRef: string;
};

type GitInfo = { branch?: string; prUrl?: string };

type RunOutcome = {
  parts: AgentPart[];
  cursorAgentId?: string;
  text?: string;
  git?: GitInfo;
  error?: string;
  // Another workflow already owns this Cursor agent; let it do the sweep
  busy?: boolean;
};

// A chat goes stale if a workflow died without releasing it
const STALE_RUN_MS = 15 * 60 * 1000;
const FLUSH_INTERVAL_MS = 100;

/**
 * Runs the Cursor cloud agent for one chat until no human messages are left
 * unanswered. Messages that arrive while a run is in progress are picked up
 * as a follow-up run on the same agent, and the whole burst is presented as
 * a single agent reply that only completes once everyone has been handled.
 */
export async function runAgentForChat(location: ChatLocation) {
  "use workflow";

  const claim = await claimChat(location);
  if (!claim) {
    return { status: "skipped" as const };
  }

  let pending = await getPendingMessages(location);
  if (pending.length === 0) {
    await releaseChat(location);
    return { status: "nothing-to-do" as const };
  }

  const agentMessageId = await createAgentMessage(location);

  let parts: AgentPart[] = [];
  const repliesTo: string[] = [];
  let cursorAgentId = claim.cursorAgentId;
  let git: GitInfo | undefined;
  let text = "";
  let error: string | undefined;
  let runIndex = 0;

  while (pending.length > 0) {
    await markHandled(location, pending);
    repliesTo.push(...pending.map((message) => message.id));

    if (runIndex > 0) {
      parts = [
        ...parts,
        {
          type: "divider",
          text: `Also handling ${formatAuthors(pending)}`,
        },
      ];
    }

    const outcome = await runCursor({
      ...location,
      agentMessageId,
      prompt: buildPrompt(pending, runIndex > 0),
      parts,
      cursorAgentId,
      model: claim.model,
      repoUrl: claim.repoUrl,
      repoRef: claim.repoRef,
    });

    if (outcome.busy) {
      await abandonAgentMessage({ ...location, agentMessageId });
      return { status: "busy" as const };
    }

    parts = outcome.parts;
    cursorAgentId = outcome.cursorAgentId ?? cursorAgentId;
    git = outcome.git ?? git;
    text = outcome.text ?? text;

    if (outcome.error) {
      error = outcome.error;
      break;
    }

    pending = await getPendingMessages(location);
    runIndex++;
  }

  await finalizeAgentMessage({
    ...location,
    agentMessageId,
    parts,
    repliesTo,
    cursorAgentId,
    git,
    text,
    error,
    title: claim.title,
  });

  return { status: error ? ("error" as const) : ("done" as const) };
}

/**
 * Marks the chat as running so concurrent posts don't start a second
 * workflow. Returns null when another workflow already owns the chat.
 */
async function claimChat({
  roomId,
  feedId,
}: ChatLocation): Promise<Claim | null> {
  "use step";

  const liveblocks = getLiveblocks();
  const feed = await liveblocks.getFeed({ roomId, feedId });
  const metadata = feed.metadata;

  const runningSince = metadata.runningSince
    ? Date.parse(metadata.runningSince)
    : Number.NaN;
  const isStale =
    Number.isNaN(runningSince) || Date.now() - runningSince > STALE_RUN_MS;

  if (metadata.agentStatus === "running" && !isStale) {
    return null;
  }

  let title = metadata.title;
  if (!title) {
    const { data: messages } = await liveblocks.getFeedMessages({
      roomId,
      feedId,
    });
    const first = [...messages]
      .sort((a, b) => a.createdAt - b.createdAt)
      .find((message) => message.data.role === "user");
    title = first ? deriveTitle(first.data.content) : "New chat";
  }

  await liveblocks.updateFeed({
    roomId,
    feedId,
    metadata: {
      agentStatus: "running",
      runningSince: new Date().toISOString(),
      title,
    },
  });

  return {
    cursorAgentId: metadata.cursorAgentId,
    model: metadata.model,
    repoUrl: metadata.repoUrl,
    repoRef: metadata.repoRef,
    title,
  };
}

async function releaseChat({ roomId, feedId }: ChatLocation) {
  "use step";

  await getLiveblocks().updateFeed({
    roomId,
    feedId,
    metadata: { agentStatus: "idle", runningSince: null },
  });
}

/** Human messages that haven't been included in an agent run yet. */
async function getPendingMessages({
  roomId,
  feedId,
}: ChatLocation): Promise<ChatMessage[]> {
  "use step";

  const { data: messages } = await getLiveblocks().getFeedMessages({
    roomId,
    feedId,
  });

  return messages
    .filter((message) => message.data.role === "user" && !message.data.handled)
    .sort((a, b) => a.createdAt - b.createdAt);
}

async function markHandled(
  { roomId, feedId }: ChatLocation,
  messages: ChatMessage[]
) {
  "use step";

  const liveblocks = getLiveblocks();
  await Promise.all(
    messages.map((message) =>
      liveblocks.updateFeedMessage({
        roomId,
        feedId,
        messageId: message.id,
        data: { ...message.data, handled: true },
      })
    )
  );
}

async function createAgentMessage({ roomId, feedId }: ChatLocation) {
  "use step";

  const message = await getLiveblocks().createFeedMessage({
    roomId,
    feedId,
    data: {
      role: "agent",
      userId: AI_USER_ID,
      content: "",
      status: "running",
      parts: [],
    },
  });

  return message.id;
}

async function abandonAgentMessage({
  roomId,
  feedId,
  agentMessageId,
}: ChatLocation & { agentMessageId: string }) {
  "use step";

  await getLiveblocks()
    .deleteFeedMessage({ roomId, feedId, messageId: agentMessageId })
    .catch(() => {});
}

/**
 * One Cursor run. Creates (or resumes) the chat's cloud agent, sends the
 * prompt, and streams tool calls and text into the agent message by
 * overwriting its `parts` on a throttle.
 */
async function runCursor(input: RunInput): Promise<RunOutcome> {
  "use step";

  const { roomId, feedId, agentMessageId, prompt, model, repoUrl, repoRef } =
    input;
  const liveblocks = getLiveblocks();
  const apiKey = getCursorApiKey();
  const parts: AgentPart[] = [...input.parts];
  let cursorAgentId = input.cursorAgentId;

  let lastFlush = 0;
  const flush = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFlush < FLUSH_INTERVAL_MS) {
      return;
    }
    lastFlush = now;
    await liveblocks.updateFeedMessage({
      roomId,
      feedId,
      messageId: agentMessageId,
      data: agentMessageData({ status: "running", parts }),
    });
  };

  const appendText = (text: string) => {
    const last = parts[parts.length - 1];
    if (last?.type === "text") {
      last.text += text;
    } else {
      parts.push({ type: "text", text });
    }
  };

  const setStatus = (text: string) => {
    const existing = parts.find((part) => part.type === "status");
    if (existing && existing.type === "status") {
      existing.text = text;
    } else {
      parts.push({ type: "status", text });
    }
  };

  const handleEvent = (event: SDKMessage) => {
    switch (event.type) {
      case "status":
        if (event.status === "CREATING") {
          setStatus("Starting cloud agent and cloning the repository…");
        } else if (event.status === "RUNNING") {
          setStatus("Cloud agent ready");
        }
        break;
      case "assistant":
        for (const block of event.message.content) {
          if (block.type === "text" && block.text) {
            appendText(block.text);
          }
        }
        break;
      case "tool_call": {
        const existing = parts.find(
          (part) => part.type === "tool" && part.callId === event.call_id
        );
        const summary = summarizeToolCall(event.name, event.args);
        if (existing && existing.type === "tool") {
          existing.status = event.status;
          if (summary) {
            existing.summary = summary;
          }
        } else {
          parts.push({
            type: "tool",
            callId: event.call_id,
            name: normalizeToolName(event.name),
            status: event.status,
            summary,
          });
        }
        break;
      }
      default:
        break;
    }
  };

  try {
    let agent: SDKAgent;

    if (cursorAgentId) {
      agent = await Agent.resume(cursorAgentId, { apiKey });
    } else {
      cursorAgentId = getCursorAgentIdForFeed(roomId, feedId);
      agent = await Agent.create({
        apiKey,
        agentId: cursorAgentId,
        model: { id: model },
        cloud: {
          repos: [{ url: repoUrl, startingRef: repoRef }],
          autoCreatePR: true,
        },
      });
    }

    setStatus("Sending request to the cloud agent…");
    await flush(true);

    const run = await agent.send(prompt, { model: { id: model } });

    for await (const event of run.stream()) {
      handleEvent(event);
      await flush();
    }

    const result = await run.wait();

    // The stream already carried the assistant text; only fall back to the
    // final result when nothing was streamed.
    if (result.result && !parts.some((part) => part.type === "text")) {
      appendText(result.result);
    }

    const error =
      result.status === "finished"
        ? undefined
        : (result.error?.message ?? `The run was ${result.status}.`);

    if (error) {
      parts.push({ type: "error", text: error });
    }

    await flush(true);

    return {
      parts,
      cursorAgentId,
      text: result.result,
      git: toGitInfo(result.git),
      error,
    };
  } catch (err) {
    // Someone else is driving this agent (a concurrent workflow won the
    // race). Its sweep will pick up our messages once it finishes.
    if (
      err instanceof AgentBusyError ||
      (err instanceof CursorSdkError && err.status === 409)
    ) {
      return { parts, cursorAgentId, busy: true };
    }

    const message = describeError(err);
    parts.push({ type: "error", text: message });
    await flush(true).catch(() => {});
    return { parts, cursorAgentId, error: message };
  }
}

async function finalizeAgentMessage({
  roomId,
  feedId,
  agentMessageId,
  parts,
  repliesTo,
  cursorAgentId,
  git,
  text,
  error,
  title,
}: ChatLocation & {
  agentMessageId: string;
  parts: AgentPart[];
  repliesTo: string[];
  cursorAgentId?: string;
  git?: GitInfo;
  text: string;
  error?: string;
  title: string;
}) {
  "use step";

  const liveblocks = getLiveblocks();

  await liveblocks.updateFeedMessage({
    roomId,
    feedId,
    messageId: agentMessageId,
    data: agentMessageData({
      status: error ? "error" : "done",
      parts,
      content: text,
      repliesTo,
      branch: git?.branch,
      prUrl: git?.prUrl,
    }),
  });

  // Everyone who has posted in the chat gets notified, including people
  // whose queued messages were merged into this reply.
  const feed = await liveblocks.getFeed({ roomId, feedId });
  const { data: messages } = await liveblocks.getFeedMessages({
    roomId,
    feedId,
  });
  const participantIds = [
    ...new Set([
      ...feed.metadata.participantIds,
      ...messages
        .filter((message) => message.data.role === "user")
        .map((message) => message.data.userId),
    ]),
  ];

  await liveblocks.updateFeed({
    roomId,
    feedId,
    metadata: {
      agentStatus: "idle",
      runningSince: null,
      participantIds,
      ...(cursorAgentId ? { cursorAgentId } : {}),
      ...(git?.branch ? { branch: git.branch } : {}),
      ...(git?.prUrl ? { prUrl: git.prUrl } : {}),
    },
  });

  const summary = error
    ? `The agent ran into a problem: ${error}`
    : summarize(text) || "The agent finished working on your request.";

  await Promise.all(
    participantIds.map((userId) =>
      liveblocks.triggerInboxNotification({
        userId,
        kind: "$agentRunCompleted",
        subjectId: agentMessageId,
        roomId,
        activityData: {
          feedId,
          chatTitle: title,
          summary,
          prUrl: git?.prUrl ?? "",
          failed: Boolean(error),
        },
      })
    )
  );
}

function agentMessageData(
  fields: Partial<Omit<ChatMessageData, "role" | "userId">>
): ChatMessageData {
  return {
    role: "agent",
    userId: AI_USER_ID,
    content: "",
    ...fields,
  };
}

function toGitInfo(git: RunResult["git"]): GitInfo | undefined {
  const branch = git?.branches.find((entry) => entry.branch || entry.prUrl);
  if (!branch) {
    return undefined;
  }
  return { branch: branch.branch, prUrl: branch.prUrl };
}

function formatAuthors(messages: ChatMessage[]) {
  const names = [
    ...new Set(
      messages.map(
        (message) => getUser(message.data.userId)?.info.name ?? "someone"
      )
    ),
  ];
  if (names.length <= 1) {
    return `${names[0] ?? "someone"}'s request`;
  }
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}'s requests`;
}

function summarize(text: string) {
  const plain = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 140 ? `${plain.slice(0, 139).trimEnd()}…` : plain;
}

function describeError(err: unknown) {
  if (err instanceof CursorSdkError) {
    const helpUrl =
      "helpUrl" in err && typeof err.helpUrl === "string" ? err.helpUrl : null;
    return helpUrl ? `${err.message} (${helpUrl})` : err.message;
  }
  return err instanceof Error ? err.message : "Unknown error";
}
