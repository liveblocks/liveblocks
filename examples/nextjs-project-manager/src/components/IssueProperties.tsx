"use client";

import {
  ClientSideSuspense,
  useMutation,
  useStorage,
} from "@liveblocks/react/suspense";
import { PRIORITY_STATES, PROGRESS_STATES } from "@/config";
import { getUsers } from "@/database";
import { Select } from "@/components/Select";

export function IssueProperties({ storageFallback }: any) {
  return (
    <ClientSideSuspense
      fallback={
        <div className="text-sm flex flex-col gap-3 justify-start items-start font-medium pt-1 -mb-1 pointer-events-none">
          <div className="block bg-transparent border-0 h-7 w-32 px-2 rounded-md transition-colors whitespace-nowrap">
            {
              PROGRESS_STATES.find(
                (p) => p.id === storageFallback.properties.progress
              )?.jsx
            }
          </div>
          <div className="block bg-transparent border-0 h-7 w-32 px-2 rounded-md transition-colors whitespace-nowrap">
            {
              PRIORITY_STATES.find(
                (p) => p.id === storageFallback.properties.priority
              )?.jsx
            }
          </div>
          <div className="block bg-transparent border-0 h-7 w-32 px-2 rounded-md transition-colors whitespace-nowrap">
            {storageFallback.properties.assignedTo === "none"
              ? "Unassigned"
              : getUsers().find(
                  (p) => p.id === storageFallback.properties.assignedTo
                )?.info.name}
          </div>
        </div>
      }
    >
      <Properties />
    </ClientSideSuspense>
  );
}

const USERS = getUsers().map((user) => ({
  id: user.id,
  jsx: <div>{user.info.name}</div>,
}));

function Properties() {
  const properties = useStorage((root) => root.properties);

  const editProperty = useMutation(({ storage }, prop, value) => {
    storage.get("properties").set(prop, value);
  }, []);

  return (
    <div className="text-sm flex flex-col gap-3 justify-start items-start font-medium">
      <Select
        id="progress"
        value={properties.progress}
        items={PROGRESS_STATES as any}
        onValueChange={(val) => editProperty("progress", val)}
      />

      <Select
        id="priority"
        value={properties.priority}
        items={PRIORITY_STATES as any}
        onValueChange={(val) => editProperty("priority", val)}
      />

      <Select
        id="assignedTo"
        value={properties.assignedTo}
        items={USERS}
        onValueChange={(val) => editProperty("assignedTo", val)}
      />
    </div>
  );
}
