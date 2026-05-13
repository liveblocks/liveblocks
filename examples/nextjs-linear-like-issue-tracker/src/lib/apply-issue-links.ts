import { liveblocks } from "@/liveblocks.server.config";
import { AI_EDITING_TYPE } from "@/lib/ai-editing-presence-types";
import { setAiRemotePresenceEditing } from "@/lib/ai-remote-presence";

/** Same cap as `create_issue` links in `ai-issue-assistant-tools.ts`. */
const MAX_ISSUE_LINKS = 30;

const MAX_URL_LENGTH = 4000;

/**
 * Appends URLs to the issue’s **Links** LiveList (deduped, order preserved for
 * new entries). Does not update room metadata (links are storage-only here).
 */
export async function appendIssueLinks(
  roomId: string,
  urls: string[]
): Promise<{ added: number }> {
  const normalized = urls
    .map((u) => u.trim())
    .filter((u) => u.length > 0 && u.length <= MAX_URL_LENGTH);

  if (normalized.length === 0) {
    return { added: 0 };
  }

  await setAiRemotePresenceEditing(roomId, [AI_EDITING_TYPE.LINKS]);

  let added = 0;
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const list = root.get("links");
    const existing = new Set<string>();
    for (let i = 0; i < list.length; i++) {
      existing.add(String(list.get(i)));
    }

    for (const url of normalized) {
      if (list.length >= MAX_ISSUE_LINKS) {
        break;
      }
      if (existing.has(url)) {
        continue;
      }
      list.push(url);
      existing.add(url);
      added += 1;
    }
  });

  return { added };
}
