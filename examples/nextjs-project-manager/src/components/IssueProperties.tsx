"use client";

import {
  ClientSideSuspense,
  useMutation,
  useStorage,
} from "@liveblocks/react/suspense";
import { PRIORITY_STATES, PROGRESS_STATES } from "@/config";
import { getUsers } from "@/database";
import { Select } from "@/components/Select";
import { useMemo, useState } from "react";

export function IssueProperties({ storageFallback }: any) {
  return (
    <ClientSideSuspense
      fallback={
        <div className="text-sm flex flex-col gap-3 justify-start items-start font-medium pt-1 -mb-1 pointer-events-none">
          <div className="block bg-transparent border-0 h-7 w-28 px-2 rounded-md transition-colors">
            {
              PROGRESS_STATES.find(
                (p) => p.id === storageFallback.properties.progress
              )?.text
            }
          </div>
          <div className="block bg-transparent border-0 h-7 w-28 px-2 rounded-md transition-colors">
            {
              PRIORITY_STATES.find(
                (p) => p.id === storageFallback.properties.priority
              )?.text
            }
          </div>
          <div className="block bg-transparent border-0 h-7 w-28 px-2 rounded-md transition-colors">
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
        items={PROGRESS_STATES}
        onValueChange={(val) => editProperty("progress", val)}
      />

      <Select
        id="priority"
        value={properties.priority}
        items={PRIORITY_STATES}
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
