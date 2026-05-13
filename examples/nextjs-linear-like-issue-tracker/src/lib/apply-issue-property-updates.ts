import { liveblocks } from "@/liveblocks.server.config";
import type { IssuePropertyUpdates } from "@/lib/issue-storage-enums";

/** Same prefix as `src/config.tsx` — used only to derive `issueId` for room metadata. */
const ROOM_PREFIX = "liveblocks:examples:nextjs-project-manager-";

function issueIdFromRoomId(roomId: string): string {
  return roomId.startsWith(ROOM_PREFIX)
    ? roomId.slice(ROOM_PREFIX.length)
    : roomId;
}

type StorageJson = {
  meta: { title: string };
  properties: {
    progress: string;
    priority: string;
    assignedTo: string;
  };
  labels: string[];
};

async function syncRoomMetadataFromStorage(roomId: string): Promise<void> {
  const doc = (await liveblocks.getStorageDocument(
    roomId,
    "json"
  )) as unknown as StorageJson;

  await liveblocks.updateRoom(roomId, {
    metadata: {
      issueId: issueIdFromRoomId(roomId),
      title: doc.meta.title,
      progress: doc.properties.progress,
      priority: doc.properties.priority,
      assignedTo: doc.properties.assignedTo,
      labels: [...doc.labels],
    },
  });
}

/**
 * Updates issue **storage** (title, properties, labels) from the server using
 * `liveblocks.mutateStorage`, then mirrors those fields into **room metadata**
 * (for lists / `useRoomInfo`), matching `src/app/api/storage-webhook/route.ts`.
 *
 * AI **presence** is already shown for the whole assistant run: `showPresence` runs
 * before streaming and `hidePresence` after the reply — including while this runs
 * inside tool `execute` handlers.
 */
export async function applyIssuePropertyUpdates(
  roomId: string,
  updates: IssuePropertyUpdates
): Promise<void> {
  const keys = Object.keys(updates) as (keyof IssuePropertyUpdates)[];
  if (keys.length === 0) {
    return;
  }

  await liveblocks.mutateStorage(roomId, ({ root }) => {
    if (updates.title !== undefined) {
      root.get("meta").set("title", updates.title);
    }

    const properties = root.get("properties");
    if (updates.progress !== undefined) {
      properties.set("progress", updates.progress);
    }
    if (updates.priority !== undefined) {
      properties.set("priority", updates.priority);
    }
    if (updates.assignedTo !== undefined) {
      properties.set("assignedTo", updates.assignedTo);
    }

    if (updates.labels !== undefined) {
      const list = root.get("labels");
      while (list.length > 0) {
        list.delete(0);
      }
      for (const id of updates.labels) {
        list.push(id);
      }
    }
  });

  await syncRoomMetadataFromStorage(roomId);
}
