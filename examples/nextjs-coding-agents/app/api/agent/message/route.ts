import { NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { auth } from "@/auth";
import { hasCursorApiKey } from "@/lib/server/cursor";
import { getLiveblocks, isExampleRoomId } from "@/lib/server/liveblocks";
import { triageMessage, type TriageDecision } from "@/lib/server/triage";
import type { AgentMessageResponse } from "@/lib/types";
import { replyInChat } from "@/workflows/reply-in-chat";
import { runAgentForChat } from "@/workflows/run-agent";

/**
 * Called by the client right after it posts a human message to a chat.
 * Triage decides what the message calls for: nothing (people talking among
 * themselves), a reply written straight into the chat by a language model,
 * or a run of the Cursor cloud agent. The coding workflow itself decides
 * whether the chat is already being worked on, in which case the message is
 * picked up as a follow-up run once the current one finishes.
 *
 * `force` rules out "nothing", for a message the author wants answered
 * after all.
 */
export async function POST(request: NextRequest) {
  // Every run is billed to the server's Cursor key, so only team members
  // may start one. Viewers can't post messages either (Liveblocks gives
  // them read-only access), so this is belt and braces.
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (session.user.role !== "member") {
    return NextResponse.json(
      { error: "Only team members can talk to the agent." },
      { status: 403 }
    );
  }

  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return NextResponse.json(
      { error: "Missing LIVEBLOCKS_SECRET_KEY" },
      { status: 403 }
    );
  }

  if (!hasCursorApiKey()) {
    return NextResponse.json(
      {
        error:
          "Missing CURSOR_API_KEY. Add it to .env.local to let the agent run.",
      },
      { status: 403 }
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const roomId = getString(body, "roomId");
  const feedId = getString(body, "feedId");
  const messageId = getString(body, "messageId");
  const force = getBoolean(body, "force");

  if (!roomId || !feedId || !isExampleRoomId(roomId)) {
    return NextResponse.json(
      { error: "Invalid room or chat" },
      { status: 400 }
    );
  }

  // Older clients don't say which message they posted; treat that as a
  // request for the coding agent, as before triage existed
  const decision = messageId
    ? await decide({ roomId, feedId, messageId, force })
    : { response: "code" as const, reason: "unavailable" as const };
  if (decision === null) {
    return NextResponse.json({ error: "Unknown message" }, { status: 404 });
  }

  switch (decision.response) {
    case "none":
      return NextResponse.json(
        {
          response: "none",
          reason: decision.reason,
        } satisfies AgentMessageResponse,
        { status: 200 }
      );
    case "chat": {
      // messageId is set: the fallback decision above is always "code"
      const run = await start(replyInChat, [
        { roomId, feedId, messageId: messageId ?? "" },
      ]);
      return NextResponse.json(
        {
          response: "chat",
          reason: decision.reason,
          runId: run.runId,
        } satisfies AgentMessageResponse,
        { status: 202 }
      );
    }
    case "code": {
      const run = await start(runAgentForChat, [{ roomId, feedId }]);
      return NextResponse.json(
        {
          response: "code",
          reason: decision.reason,
          runId: run.runId,
        } satisfies AgentMessageResponse,
        { status: 202 }
      );
    }
  }
}

/**
 * Runs triage on the posted message and records the outcome on it, so the
 * coding workflow and the UI agree on what happens to it:
 *
 * - `none`: handled, `forAgent: false`; nothing picks it up, and clients
 *   label it as not sent to the agent.
 * - `chat`: handled, `forAgent: true`; the reply workflow answers it, and
 *   the coding workflow never sees it.
 * - `code`: `forAgent: true` and unhandled, so the coding workflow queues
 *   it; clients only show "Queued" once this is written.
 *
 * Null if the message isn't in the chat.
 */
async function decide({
  roomId,
  feedId,
  messageId,
  force,
}: {
  roomId: string;
  feedId: string;
  messageId: string;
  force: boolean;
}): Promise<TriageDecision | null> {
  const liveblocks = getLiveblocks();
  const [{ data: messages }, feed] = await Promise.all([
    liveblocks.getFeedMessages({ roomId, feedId }),
    liveblocks.getFeed({ roomId, feedId }),
  ]);
  const message = messages.find((candidate) => candidate.id === messageId);
  if (!message || message.data.role !== "user") {
    return null;
  }

  const decision = await triageMessage({
    message,
    messages,
    metadata: feed.metadata,
    force,
  });

  if (decision.reason === "model") {
    const odds = decision.probabilities
      ? ` none=${decision.probabilities.none.toFixed(2)} chat=${decision.probabilities.chat.toFixed(2)} code=${decision.probabilities.code.toFixed(2)}`
      : "";
    console.info(
      `[triage] ${decision.response}${odds}: ${message.data.content.slice(0, 80)}`
    );
  }

  await liveblocks.updateFeedMessage({
    roomId,
    feedId,
    messageId,
    data: {
      ...message.data,
      forAgent: decision.response !== "none",
      handled: decision.response !== "code",
    },
  });

  return decision;
}

function getString(body: unknown, key: string) {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" && value ? value : null;
}

function getBoolean(body: unknown, key: string) {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  return (body as Record<string, unknown>)[key] === true;
}
