import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  DEFAULT_REF,
  DIFF_ARTIFACT_PATH,
  getCompareDiffUrl,
} from "@/lib/repo";
import { downloadArtifact } from "@/lib/server/cursor";
import { getLiveblocks, isExampleRoomId } from "@/lib/server/liveblocks";
import type { ChangesInfo } from "@/lib/types";

// One entry per agent; the key includes the changes' timestamp so a new run
// invalidates it.
const cache = new Map<string, { key: string; diff: string }>();

/** GitHub serves branch diffs of public repositories without credentials. */
async function fetchCompareDiff(
  repoUrl: string,
  base: string,
  head: string
): Promise<string | Error> {
  const response = await fetch(getCompareDiffUrl(repoUrl, base, head), {
    headers: { Accept: "text/plain" },
  }).catch((err: unknown) => new Error(describeError(err)));
  if (response instanceof Error) {
    return response;
  }
  if (!response.ok) {
    return new Error(
      response.status === 404
        ? "The agent didn't save a diff of its changes, and the branch is not publicly readable on GitHub."
        : `GitHub returned ${response.status} for the branch diff`
    );
  }
  return response.text();
}

function describeError(err: unknown) {
  return err instanceof Error ? err.message : "Could not download the diff";
}

/**
 * Returns the diff of the agent's work on a chat. The agent writes it as a
 * Cursor artifact at the end of every run, so it's available as soon as a
 * run finishes, whether or not a pull request was opened, and needs no
 * GitHub credentials. The download URL Cursor hands out is short-lived, so
 * the server fetches the file and streams the text back. If the agent
 * skipped saving the artifact, the pushed branch's diff is read from GitHub
 * instead.
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

  const { cursorAgentId, diffUpdatedAt, branch, prUrl, repoUrl, repoRef } =
    feed.metadata;
  if (!cursorAgentId || !(diffUpdatedAt || branch)) {
    return NextResponse.json(
      { error: "The agent hasn't produced any changes yet" },
      { status: 404 }
    );
  }

  // Chats from before the agent saved diffs only have a branch to go on
  const updatedAt = diffUpdatedAt ?? new Date(feed.updatedAt).toISOString();
  const cacheKey = `${cursorAgentId}:${updatedAt}`;
  const cached = cache.get(cursorAgentId);
  let diff = cached?.key === cacheKey ? cached.diff : null;

  if (diff === null) {
    // The artifact the agent saved is the primary source. If it didn't save
    // one but pushed a branch, GitHub can serve the diff for public repos.
    let result = await downloadArtifact(cursorAgentId, DIFF_ARTIFACT_PATH)
      .then((buffer) => buffer.toString("utf8"))
      .catch((err: unknown) => new Error(describeError(err)));

    if (result instanceof Error && branch && repoUrl) {
      result = await fetchCompareDiff(repoUrl, repoRef ?? DEFAULT_REF, branch);
    }

    if (result instanceof Error) {
      return NextResponse.json({ error: result.message }, { status: 502 });
    }
    diff = result;
    cache.set(cursorAgentId, { key: cacheKey, diff });
  }

  const info: ChangesInfo = {
    diff,
    updatedAt,
    branch,
    prUrl,
  };
  return NextResponse.json(info);
}
