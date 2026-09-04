import { NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { hasCursorApiKey } from "@/lib/server/cursor";
import { isExampleRoomId } from "@/lib/server/liveblocks";
import { runAgentForChat } from "@/workflows/run-agent";

/**
 * Called by the client right after it posts a human message to a chat.
 * Starts the durable workflow that runs the Cursor cloud agent for that
 * chat. The workflow itself decides whether the chat is already being
 * worked on, in which case the new message is picked up as a follow-up run
 * once the current one finishes.
 */
export async function POST(request: NextRequest) {
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

  if (!roomId || !feedId || !isExampleRoomId(roomId)) {
    return NextResponse.json(
      { error: "Invalid room or chat" },
      { status: 400 }
    );
  }

  const run = await start(runAgentForChat, [{ roomId, feedId }]);

  return NextResponse.json({ runId: run.runId }, { status: 202 });
}

function getString(body: unknown, key: string) {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" && value ? value : null;
}
