import { liveblocks } from "@/liveblocks.server.config";
import type { IssuePropertyUpdates } from "@/lib/issue-storage-enums";
import { setAiRemotePresenceEditing } from "@/lib/ai-remote-presence";
import { AI_EDITING_TYPE } from "@/lib/ai-editing-presence-types";

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
 * `editingTypes` is left set after this returns; `hidePresence` at the end of
 * an AI run clears it.
 */
function editingTypesFromPropertyUpdates(
  updates: IssuePropertyUpdates
): string[] {
  const types: string[] = [];
  if (updates.title !== undefined) types.push(AI_EDITING_TYPE.TITLE);
  if (updates.progress !== undefined) types.push(AI_EDITING_TYPE.PROGRESS);
  if (updates.priority !== undefined) types.push(AI_EDITING_TYPE.PRIORITY);
  if (updates.assignedTo !== undefined) {
    types.push(AI_EDITING_TYPE.ASSIGNED_TO);
  }
  if (updates.labels !== undefined) types.push(AI_EDITING_TYPE.LABELS);
  return types;
}

export async function applyIssuePropertyUpdates(
  roomId: string,
  updates: IssuePropertyUpdates
): Promise<void> {
  const keys = Object.keys(updates) as (keyof IssuePropertyUpdates)[];
  if (keys.length === 0) {
    return;
  }

  const editingTypes = editingTypesFromPropertyUpdates(updates);
  await setAiRemotePresenceEditing(roomId, editingTypes);

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
