import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { DIFF_ARTIFACT_PATH } from "@/lib/repo";
import { downloadArtifact } from "@/lib/server/cursor";
import { getLiveblocks, isExampleRoomId } from "@/lib/server/liveblocks";
import type { ChangesInfo } from "@/lib/types";

// One entry per agent; the key includes the artifact's timestamp so a new
// run invalidates it.
const cache = new Map<string, { key: string; diff: string }>();

/**
 * Returns the diff of the agent's work on a chat. The agent writes it as a
 * Cursor artifact at the end of every run, so it's available as soon as a
 * run finishes, whether or not a pull request was opened, and needs no
 * GitHub credentials. The download URL Cursor hands out is short-lived, so
 * the server fetches the file and streams the text back.
 */
export async function GET(request: NextRequest) {
  if (!(await auth())) {
    return new NextResponse("Not signed in", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId") ?? "";
  const feedId = searchParams.get("feedId") ?? "";
  if (!feedId || !isExampleRoomId(roomId)) {
    return NextResponse.json(
      { error: "Invalid room or chat" },
      { status: 400 }
    );
  }

  const feed = await getLiveblocks()
    .getFeed({ roomId, feedId })
    .catch(() => null);
  if (!feed) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const { cursorAgentId, diffUpdatedAt, branch, prUrl } = feed.metadata;
  if (!cursorAgentId || !diffUpdatedAt) {
    return NextResponse.json(
      { error: "The agent hasn't produced any changes yet" },
      { status: 404 }
    );
  }

  const cacheKey = `${cursorAgentId}:${diffUpdatedAt}`;
  const cached = cache.get(cursorAgentId);
  let diff = cached?.key === cacheKey ? cached.diff : null;

  if (diff === null) {
    try {
      const buffer = await downloadArtifact(cursorAgentId, DIFF_ARTIFACT_PATH);
      diff = buffer.toString("utf8");
      cache.set(cursorAgentId, { key: cacheKey, diff });
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "Could not download the diff from Cursor",
        },
        { status: 502 }
      );
    }
  }

  const info: ChangesInfo = {
    diff,
    updatedAt: diffUpdatedAt,
    branch,
    prUrl,
  };
  return NextResponse.json(info);
}
