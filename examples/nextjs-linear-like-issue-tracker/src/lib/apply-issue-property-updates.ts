import {
  getIssueId,
  type IssueLabelId,
  type IssuePriorityId,
  type IssueProgressId,
} from "@/config";
import type { ImmutableStorage } from "@/liveblocks.config";
import { liveblocks } from "@/liveblocks.server.config";
import {
  AI_EDITING_TYPE,
  type AiEditingPresenceType,
} from "@/lib/ai-editing-presence-types";
import { setAiRemotePresenceEditing } from "@/lib/ai-remote-presence";
import type { BackgroundTasks } from "@/lib/background-tasks";

export type IssuePropertyUpdates = {
  title?: string;
  progress?: IssueProgressId;
  priority?: IssuePriorityId;
  assignedTo?: string | "none";
  labels?: IssueLabelId[];
};

async function syncRoomMetadataFromStorage(roomId: string): Promise<void> {
  const doc = (await liveblocks.getStorageDocument(
    roomId,
    "json"
  )) as unknown as ImmutableStorage;

  await liveblocks.updateRoom(roomId, {
    metadata: {
      issueId: getIssueId(roomId),
      title: doc.meta.title,
      progress: doc.properties.progress,
      priority: doc.properties.priority,
      assignedTo: doc.properties.assignedTo,
      labels: [...doc.labels],
    },
  });
}

function editingTypesFromPropertyUpdates(
  updates: IssuePropertyUpdates
): AiEditingPresenceType[] {
  const types: AiEditingPresenceType[] = [];
  if (updates.title !== undefined) types.push(AI_EDITING_TYPE.TITLE);
  if (updates.progress !== undefined) types.push(AI_EDITING_TYPE.PROGRESS);
  if (updates.priority !== undefined) types.push(AI_EDITING_TYPE.PRIORITY);
  if (updates.assignedTo !== undefined) {
    types.push(AI_EDITING_TYPE.ASSIGNED_TO);
  }
  if (updates.labels !== undefined) types.push(AI_EDITING_TYPE.LABELS);
  return types;
}

// Updates storage values and sets presence.
//
// When `background` is given, presence and the room-metadata sync are handed
// off to it instead of awaited, so only the storage mutation itself (the part
// users see) sits on the critical path.
export async function applyIssuePropertyUpdates(
  roomId: string,
  updates: IssuePropertyUpdates,
  background?: BackgroundTasks
): Promise<void> {
  const keys = Object.keys(updates) as (keyof IssuePropertyUpdates)[];
  if (keys.length === 0) {
    return;
  }

  const presence$ = setAiRemotePresenceEditing(
    roomId,
    editingTypesFromPropertyUpdates(updates)
  );
  if (background) {
    background.add(presence$);
  } else {
    await presence$;
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

  if (background) {
    background.add(syncRoomMetadataFromStorage(roomId));
  } else {
    await syncRoomMetadataFromStorage(roomId);
  }
}
