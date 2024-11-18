"use client";

import { useSyncStatus } from "@liveblocks/react/suspense";
import { SpinnerIcon } from "../icons/SpinnerIcon";
import { CompleteIcon } from "../icons/CompleteIcon";

export function Status() {
  const status = useSyncStatus({ smooth: true });

  return (
    <div className="flex items-center text-gray-500 font-semibold gap-1.5 text-xs">
      {status === "synchronizing" ? (
        <SpinnerIcon className="w-5 h-5 opacity-70 animate-spin" />
      ) : (
        <CompleteIcon className="w-5 h-5 opacity-70 p-[1px]" />
      )}
    </div>
  );
}
