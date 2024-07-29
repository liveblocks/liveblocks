"use client";

import {
  ClientSideSuspense,
  useMutation,
  useStorage,
} from "@liveblocks/react/suspense";
import { priorityStates, progressStates } from "@/config";
import { getUsers } from "@/database";

export function IssueProperties() {
  return (
    <ClientSideSuspense fallback={null}>
      <Properties />
    </ClientSideSuspense>
  );
}

function Properties() {
  const properties = useStorage((root) => root.properties);

  const editProperty = useMutation(({ storage }, prop, value) => {
    storage.get("properties").set(prop, value);
  }, []);

  return (
    <div className="text-sm flex flex-col gap-3 justify-start items-start font-medium">
      <select
        id="progress"
        onInput={(e) => {
          editProperty("progress", e.currentTarget.value);
        }}
        className="block bg-transparent border-0 h-7 w-28 px-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-neutral-200 appearance-none"
        value={properties.progress || undefined}
      >
        {progressStates.map(({ id, text }) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>

      <select
        id="priority"
        onInput={(e) => {
          editProperty("priority", e.currentTarget.value);
        }}
        className="block bg-transparent border-0 h-7 w-28 px-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-neutral-200 appearance-none"
        value={properties.priority || undefined}
      >
        {priorityStates.map(({ id, text }) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>

      <select
        id="assigned-to"
        onInput={(e) => {
          editProperty("assignedTo", e.currentTarget.value);
        }}
        className="block bg-transparent border-0 h-7 w-28 px-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-neutral-200 appearance-none"
        value={properties.assignedTo || undefined}
      >
        {getUsers().map(({ id, info: { name } }) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
