import { Agent } from "@cursor/sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCursorApiKey, hasCursorApiKey } from "@/lib/server/cursor";
import {
  getLiveblocks,
  isExampleRoomId,
  patchFeedMetadata,
} from "@/lib/server/liveblocks";

/**
 * Stops the Cursor run in progress for a chat. The workflow notices the run
 * finishing as "cancelled", wraps up the agent message, and credits whoever
 * pressed the button using the login recorded here.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (session.user.role !== "member") {
    return NextResponse.json(
      { error: "Only team members can stop the agent." },
      { status: 403 }
    );
  }

  if (!process.env.LIVEBLOCKS_SECRET_KEY || !hasCursorApiKey()) {
    return NextResponse.json(
      { error: "Missing LIVEBLOCKS_SECRET_KEY or CURSOR_API_KEY" },
      { status: 403 }
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const roomId = getString(body, "roomId");
  const feedId = getString(body, "feedId");

  if (!roomId || !feedId || !isExampleRoomId(roomId)) {
    return NextResponse.json(
      { error: "Invalid room or chat" },
      { status: 400 }
    );
  }

  const liveblocks = getLiveblocks();
  const { metadata } = await liveblocks.getFeed({ roomId, feedId });

  if (metadata.agentStatus !== "running") {
    return NextResponse.json(
      { error: "The agent isn't running." },
      { status: 409 }
    );
  }

  const { cursorAgentId, cursorRunId } = metadata;
  if (!cursorAgentId || !cursorRunId) {
    // The workflow has claimed the chat but hasn't sent the prompt yet
    return NextResponse.json(
      { error: "The run is still starting. Try again in a moment." },
      { status: 409 }
    );
  }

  // Recorded before cancelling so the workflow can read it when the run
  // comes back as cancelled.
  await patchFeedMetadata(
    liveblocks,
    { roomId, feedId },
    { stopRequestedBy: session.user.login },
    metadata
  );

  await Agent.cancelRun(cursorRunId, {
    runtime: "cloud",
    agentId: cursorAgentId,
    apiKey: getCursorApiKey(),
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}

function getString(body: unknown, key: string) {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" && value ? value : null;
}
