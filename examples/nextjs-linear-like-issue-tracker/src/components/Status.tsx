"use client";

import { useSyncStatus } from "@liveblocks/react/suspense";
import { SyncCompleteIcon } from "@/icons/SyncCompleteIcon";
import { SyncSpinnerIcon } from "@/icons/SyncSpinnerIcon";

export function Status() {
  const status = useSyncStatus({ smooth: true });
  return (
    <div className="flex items-center text-gray-500 font-semibold gap-1.5 text-xs">
      {status === "synchronizing" ? (
        <SyncSpinnerIcon className="w-5 h-5 opacity-80 p-[1px] animate-spin" />
      ) : (
        <SyncCompleteIcon className="w-5 h-5 opacity-80" />
      )}
    </div>
  );
}
