import type { Liveblocks } from "@liveblocks/node";
import { patchFeedMetadata } from "@/lib/server/liveblocks";

/** A claimed chat is considered abandoned if its workflow died without releasing it */
export const STALE_RUN_MS = 15 * 60 * 1000;

/**
 * Cleans up after a run whose workflow died without wrapping up: every
 * agent message still marked as running is closed with an error, and the
 * chat is released so people can post again. Used when a stale claim is
 * taken over, and by "Stop" when there's no live run left to cancel.
 */
export async function abandonRun(
  liveblocks: Liveblocks,
  { roomId, feedId }: { roomId: string; feedId: string },
  reason: string
) {
  const [{ data: messages }, feed] = await Promise.all([
    liveblocks.getFeedMessages({ roomId, feedId }),
    liveblocks.getFeed({ roomId, feedId }),
  ]);

  const stuck = messages.filter(
    (message) =>
      message.data.role === "agent" && message.data.status === "running"
  );
  const now = Date.now();
  await Promise.all(
    stuck.map((message) =>
      liveblocks.updateFeedMessage({
        roomId,
        feedId,
        messageId: message.id,
        data: {
          ...message.data,
          status: "error",
          finishedAt: now,
          parts: [
            ...(message.data.parts ?? []).map((part) =>
              part.type === "tool" && part.status === "running"
                ? { ...part, status: "error" as const }
                : part
            ),
            { type: "error" as const, text: reason },
          ],
        },
      })
    )
  );

  if (feed.metadata.agentStatus === "running") {
    await patchFeedMetadata(
      liveblocks,
      { roomId, feedId },
      {
        agentStatus: "idle",
        runningSince: null,
        cursorRunId: null,
        stopRequestedBy: null,
      },
      feed.metadata
    );
  }

  return stuck.length;
}
