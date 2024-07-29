"use client";

import {
  ClientSideSuspense,
  useMutation,
  useStorage,
} from "@liveblocks/react/suspense";
import { LABELS } from "@/config";

export function IssueLabels() {
  return (
    <ClientSideSuspense fallback={null}>
      <Labels />
    </ClientSideSuspense>
  );
}

function Labels() {
  const labels = useStorage((root) => root.labels);

  const addLabel = useMutation(({ storage }, labelId) => {
    storage.get("labels").push(labelId);
  }, []);

  const removeLabel = useMutation(({ storage }, labelId) => {
    const index = storage.get("labels").findIndex((label) => label === labelId);
    storage.get("labels").delete(index);
  }, []);

  return (
    <div className="text-sm flex flex-col gap-3 justify-start items-start font-medium">
      <select
        id="add-label"
        onInput={(e) => {
          addLabel(e.currentTarget.value);
        }}
        className="block bg-transparent border-0 h-7 w-28 px-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-neutral-200 appearance-none"
        value="add"
      >
        <option value="add" disabled hidden>
          + Add label
        </option>
        {LABELS.map(({ id, text }) => (
          <option key={id} value={id} disabled={labels.includes(id)}>
            {text}
          </option>
        ))}
      </select>
      {LABELS.filter((label) => labels.includes(label.id)).map(
        ({ id, text }) => (
          <div key={id}>
            {text} <button onClick={() => removeLabel(id)}>x</button>
          </div>
        )
      )}
    </div>
  );
}
