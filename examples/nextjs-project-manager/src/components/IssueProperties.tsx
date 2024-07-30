"use client";

import { ClientSideSuspense } from "@liveblocks/react/suspense";
import {
  PRIORITY_STATES,
  PriorityState,
  PROGRESS_STATES,
  ProgressState,
} from "@/config";
import { getUsers } from "@/database";
import { useRoomData } from "@/hooks/useRoomData";

export function IssueProperties() {
  return (
    <ClientSideSuspense fallback={null}>
      <Properties />
    </ClientSideSuspense>
  );
}

function Properties() {
  const { roomData, updateRoomMetadata } = useRoomData();

  if (!roomData) {
    return null;
  }

  const { progress, priority, assignedTo } = roomData.metadata;

  return (
    <div className="text-sm flex flex-col gap-3 justify-start items-start font-medium">
      <select
        id="progress"
        onInput={(e) => {
          updateRoomMetadata({
            progress: e.currentTarget.value as ProgressState,
          });
        }}
        className="block bg-transparent border-0 h-7 w-28 px-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-neutral-200 appearance-none"
        value={progress}
      >
        {PROGRESS_STATES.map(({ id, text }) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>

      <select
        id="priority"
        onInput={(e) => {
          updateRoomMetadata({
            priority: e.currentTarget.value as PriorityState,
          });
        }}
        className="block bg-transparent border-0 h-7 w-28 px-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-neutral-200 appearance-none"
        value={priority}
      >
        {PRIORITY_STATES.map(({ id, text }) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>

      <select
        id="assigned-to"
        onInput={(e) => {
          console.log(e.currentTarget.value);
          updateRoomMetadata({ assignedTo: e.currentTarget.value });
        }}
        className="block bg-transparent border-0 h-7 w-28 px-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-neutral-200 appearance-none"
        value={assignedTo}
      >
        <option value="none">No Assignee</option>
        {getUsers().map(({ id, info: { name } }) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
