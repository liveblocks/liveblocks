import { Agent } from "@cursor/sdk";
import { after, NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCursorApiKey, hasCursorApiKey } from "@/lib/server/cursor";
import {
  getLiveblocks,
  isExampleRoomId,
  patchFeedMetadata,
} from "@/lib/server/liveblocks";
import { abandonRun, STALE_RUN_MS } from "@/lib/server/runs";

/** How long the workflow gets to wrap up after a cancellation */
const WRAP_UP_GRACE_MS = 20_000;

/**
 * Stops the Cursor run in progress for a chat. The workflow notices the run
 * finishing as "cancelled", wraps up the agent message, and credits whoever
 * pressed the button using the login recorded here. If the workflow behind
 * the run has died (a chat stuck on "Working…" with nothing happening), the
 * message and chat are closed directly instead.
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
  const runningSince = metadata.runningSince
    ? Date.parse(metadata.runningSince)
    : Number.NaN;
  const isStale =
    Number.isNaN(runningSince) || Date.now() - runningSince > STALE_RUN_MS;
  const stoppedBy = session.user.name ?? session.user.login;

  if (!cursorAgentId || !cursorRunId) {
    if (isStale) {
      // Claimed long ago and never got as far as a run: the workflow died
      await abandonRun(
        liveblocks,
        { roomId, feedId },
        abandonReason(stoppedBy)
      );
      return NextResponse.json({ ok: true }, { status: 200 });
    }
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

  try {
    await Agent.cancelRun(cursorRunId, {
      runtime: "cloud",
      agentId: cursorAgentId,
      apiKey: getCursorApiKey(),
    });
  } catch (error) {
    // Nothing left to cancel (the run already ended, or the agent is gone),
    // yet the chat still says running: the workflow died. Close it directly.
    console.warn("[agent/stop] cancelRun failed; closing the run", error);
    await abandonRun(liveblocks, { roomId, feedId }, abandonReason(stoppedBy));
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Normally the workflow sees the cancellation and wraps up within
  // seconds. If it doesn't, it's dead, and the chat would spin forever.
  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, WRAP_UP_GRACE_MS));
    const { metadata: latest } = await liveblocks
      .getFeed({ roomId, feedId })
      .catch(() => ({ metadata: null }));
    if (
      latest?.agentStatus === "running" &&
      latest.runningSince === metadata.runningSince
    ) {
      console.warn("[agent/stop] workflow didn't wrap up; closing the run");
      await abandonRun(
        liveblocks,
        { roomId, feedId },
        abandonReason(stoppedBy)
      );
    }
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}

function abandonReason(stoppedBy: string) {
  return `The run had stopped responding; ${stoppedBy} closed it.`;
}

function getString(body: unknown, key: string) {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" && value ? value : null;
}
