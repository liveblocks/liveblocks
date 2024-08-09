"use client";

import {
  ClientSideSuspense,
  useMutation,
  useStorage,
} from "@liveblocks/react/suspense";
import { LABELS } from "@/config";

export function IssueLabels({ storageFallback }: any) {
  return (
    <ClientSideSuspense
      fallback={
        <div className="text-sm flex gap-1.5 justify-start items-start font-medium max-w-full flex-wrap min-h-[26px] pointer-events-none">
          {LABELS.filter((label) =>
            storageFallback.labels.includes(label.id)
          ).map(({ id, text }) => (
            <div
              key={id}
              className="text-sm font-medium rounded-full px-2 py-0.5 border shadow-xs flex items-center gap-1.5 select-none text-neutral-700"
            >
              <div className="bg-neutral-400/60 rounded-full w-2 h-2" />
              {text}{" "}
              <div className="text-base leading-none pb-0.5 text-neutral-400">
                ×
              </div>
            </div>
          ))}
        </div>
      }
    >
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
    <div className="text-sm flex gap-1.5 justify-start items-start font-medium max-w-full flex-wrap">
      {LABELS.filter((label) => labels.includes(label.id)).map(
        ({ id, text }) => (
          <div
            key={id}
            className="text-sm font-medium rounded-full px-2 py-0.5 border shadow-xs flex items-center gap-1.5 select-none text-neutral-700"
          >
            <div className="bg-neutral-400/60 rounded-full w-2 h-2" />
            {text}{" "}
            <button
              className="text-base leading-none pb-0.5 text-neutral-400"
              onClick={() => removeLabel(id)}
            >
              ×
            </button>
          </div>
        )
      )}
      <select
        id="add-label"
        onInput={(e) => {
          addLabel(e.currentTarget.value);
        }}
        className="flex items-center bg-transparent border-0 h-[26px] w-[26px] pl-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-neutral-200 appearance-none"
        value="add"
      >
        <option value="add" disabled hidden>
          ＋
        </option>
        {LABELS.map(({ id, text }) => (
          <option
            key={id}
            value={id}
            disabled={labels.includes(id)}
            className="text-sm"
          >
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}
