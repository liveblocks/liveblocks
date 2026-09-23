import { NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { auth } from "@/auth";
import { hasCursorApiKey } from "@/lib/server/cursor";
import { getLiveblocks, isExampleRoomId } from "@/lib/server/liveblocks";
import { triageMessage, type TriageDecision } from "@/lib/server/triage";
import type { AgentMessageResponse } from "@/lib/types";
import { runAgentForChat } from "@/workflows/run-agent";

/**
 * Called by the client right after it posts a human message to a chat.
 * First decides whether the message is for the agent at all (people can
 * talk among themselves in a chat); if not, it's marked handled and nothing
 * runs. Otherwise this starts the durable workflow that runs the Cursor
 * cloud agent for the chat. The workflow itself decides whether the chat is
 * already being worked on, in which case the message is picked up as a
 * follow-up run once the current one finishes.
 *
 * `force` skips the check, for a message the author wants sent after all.
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
  // request for the agent, as before triage existed
  const decision = messageId
    ? await decide({ roomId, feedId, messageId, force })
    : { forAgent: true, reason: "unavailable" as const };
  if (decision === null) {
    return NextResponse.json({ error: "Unknown message" }, { status: 404 });
  }

  if (!decision.forAgent) {
    return NextResponse.json(
      { queued: false, reason: decision.reason } satisfies AgentMessageResponse,
      { status: 200 }
    );
  }

  const run = await start(runAgentForChat, [{ roomId, feedId }]);

  return NextResponse.json(
    {
      queued: true,
      reason: decision.reason,
      runId: run.runId,
    } satisfies AgentMessageResponse,
    { status: 202 }
  );
}

/**
 * Runs triage on the posted message and records the outcome on it. A
 * message left to the team is marked handled so the workflow never picks it
 * up; a forced one is un-handled again so it does. Null if the message
 * isn't in the chat.
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

  const decision: TriageDecision = force
    ? { forAgent: true, reason: "forced" }
    : await triageMessage({ message, messages, metadata: feed.metadata });

  if (decision.reason === "model" || force) {
    console.info(
      `[triage] ${decision.forAgent ? "agent" : "team"} (${decision.reason}${
        decision.probability !== undefined
          ? `, p=${decision.probability.toFixed(2)}`
          : ""
      }): ${message.data.content.slice(0, 80)}`
    );
  }

  if (!decision.forAgent) {
    await liveblocks.updateFeedMessage({
      roomId,
      feedId,
      messageId,
      data: { ...message.data, handled: true, forAgent: false },
    });
  } else if (message.data.forAgent === false) {
    // Sent after all: put it back in the queue
    await liveblocks.updateFeedMessage({
      roomId,
      feedId,
      messageId,
      data: { ...message.data, handled: false, forAgent: true },
    });
  }

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
