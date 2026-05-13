import type { RoomData } from "@liveblocks/node";
import { getIssueId, getRoomId, type Metadata } from "@/config";
import { liveblocks } from "@/liveblocks.server.config";

export type IssueSearchHit = {
  issueId: string;
  title: string;
  progress: string;
  priority: string;
};

function roomToHit(room: RoomData): IssueSearchHit | null {
  if (!room.id.startsWith(getRoomId(""))) {
    return null;
  }
  const metadata = (room.metadata ?? {}) as Partial<Metadata>;
  const issueId =
    typeof metadata.issueId === "string" && metadata.issueId.length > 0
      ? metadata.issueId
      : getIssueId(room.id);
  if (!issueId) {
    return null;
  }
  const title =
    typeof metadata.title === "string" && metadata.title.length > 0
      ? metadata.title
      : "Untitled";
  return {
    issueId,
    title,
    progress:
      typeof metadata.progress === "string" ? metadata.progress : "none",
    priority:
      typeof metadata.priority === "string" ? metadata.priority : "none",
  };
}

/**
 * Fetches the **most recently created** issue rooms for this app (Liveblocks
 * `getRooms` order: newest first). Scoped to this example’s room id prefix.
 * Optionally narrows by substring on title or issue id (client-side only).
 */
export async function fetchRecentIssueRoomsForAi(options: {
  limit: number;
  excludeIssueId: string;
  titleOrIdContains?: string;
}): Promise<IssueSearchHit[]> {
  const limit = Math.min(Math.max(options.limit, 1), 50);
  const page = await liveblocks.getRooms({
    limit,
    query: { roomId: { startsWith: getRoomId("") } },
  });

  let hits = page.data
    .map((r) => roomToHit(r))
    .filter((h): h is IssueSearchHit => h !== null)
    .filter((h) => h.issueId !== options.excludeIssueId);

  const q = options.titleOrIdContains?.trim().toLowerCase();
  if (q) {
    hits = hits.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.issueId.toLowerCase().includes(q)
    );
  }

  return hits;
}
